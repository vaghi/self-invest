import type {
  Balance, Position, Order, MarketDataPackage, TradeProposal,
  MarketAnalysisResult, TradeDecisionResult,
} from '@self-invest/shared';
import { requireBroker } from '../broker/factory.js';
import type { IBrokerAdapter } from '../broker/interface.js';
import { requireAIProvider } from '../ai/factory.js';
import {
  MARKET_ANALYSIS_SYSTEM_PROMPT, TRADE_DECISION_SYSTEM_PROMPT,
  MARKET_ANALYSIS_COMPACT_PROMPT, TRADE_DECISION_COMPACT_PROMPT,
} from '../ai/prompts/templates.js';
import { parseMarketAnalysis, parseTradeDecision } from '../ai/response-parser.js';
import { validateTrade, checkDeathCondition } from '../risk/manager.js';
import { calculateIndicators } from '../market-data/indicators/technical.js';
import { transitionTo, isDead } from './state-machine.js';
import { isMarketOpen } from './market-hours.js';
import { prisma } from '../db/client.js';
import { eventBus } from '../services/event-bus.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { trackError } from '../services/error-tracker.js';
import { getActiveInstructionsBlock } from '../services/chat-processor.js';

const WATCHLIST_FULL = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'SPY', 'QQQ', 'IWM',
  'AMD', 'NFLX', 'CRM', 'UBER', 'SQ', 'COIN', 'PLTR', 'SNAP', 'ROKU', 'SHOP',
];
const WATCHLIST_COMPACT = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY', 'AMD', 'META'];
const MAX_RETRIES = 3;

async function getCustomWatchlist(): Promise<{ add: string[]; remove: string[] }> {
  const instructions = await prisma.userInstruction.findMany({
    where: { status: 'ACTIVE', category: 'watchlist' },
  });
  const add: string[] = [];
  const remove: string[] = [];
  for (const inst of instructions) {
    const rule = inst.compactRule.toUpperCase();
    if (rule.startsWith('ADD:')) {
      add.push(...rule.replace('ADD:', '').trim().split(/[\s,]+/).filter(Boolean));
    } else if (rule.startsWith('REMOVE:')) {
      remove.push(...rule.replace('REMOVE:', '').trim().split(/[\s,]+/).filter(Boolean));
    }
  }
  return { add, remove };
}

export async function runPipeline(): Promise<void> {
  if (isDead()) {
    logger.warn('Agent is dead, skipping pipeline');
    return;
  }

  try {
    transitionTo('analyzing');
    const broker = requireBroker();
    const ai = requireAIProvider();

    await syncPendingOrders(broker);

    const [balance, positions] = await Promise.all([
      broker.getBalance(),
      broker.getPositions(),
    ]);

    if (checkDeathCondition(balance)) {
      await handleDeath(balance, positions);
      return;
    }

    await takePortfolioSnapshot(balance);

    const heldSymbols = positions.map((p) => p.symbol);
    const baseWatchlist = ai.isLocal ? WATCHLIST_COMPACT : WATCHLIST_FULL;
    const custom = await getCustomWatchlist();
    const watchlist = [...new Set([...baseWatchlist, ...heldSymbols, ...custom.add])]
      .filter((s) => !custom.remove.includes(s));

    const [marketData, instructionsBlock] = await Promise.all([
      gatherMarketData(watchlist),
      getActiveInstructionsBlock(),
    ]);

    let analysis: MarketAnalysisResult | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const prompt = buildAnalysisPrompt(balance, positions, marketData, instructionsBlock);
      const response = await ai.analyze(prompt, {
        systemPrompt: ai.isLocal ? MARKET_ANALYSIS_COMPACT_PROMPT : MARKET_ANALYSIS_SYSTEM_PROMPT,
        maxTokens: ai.isLocal ? 2048 : 4096,
        temperature: 0.2,
      });

      const parsed = parseMarketAnalysis(response.content);

      await prisma.aIAnalysis.create({
        data: {
          provider: response.provider.toUpperCase() as any,
          model: response.model,
          analysisType: 'MARKET_SCAN',
          inputData: { watchlist, positionCount: positions.length },
          outputData: response.parsed || {},
          reasoning: response.content.slice(0, 2000),
          confidence: parsed ? parsed.overallConfidence : 0,
          tokensUsed: response.tokensUsed,
          latencyMs: response.latencyMs,
          costUsd: ai.estimateCost(response.tokensUsed.input, response.tokensUsed.output).toFixed(6),
        },
      });

      if (parsed) {
        analysis = parsed;
        eventBus.emit('analysis_update', analysis);
        break;
      }
      logger.warn({ attempt }, 'Failed to parse market analysis, retrying');
    }

    if (!analysis) {
      logger.error('Market analysis failed after all retries');
      transitionTo('idle');
      return;
    }

    if (analysis.bullishSymbols.length === 0 && analysis.bearishSymbols.length === 0) {
      if (env.agentForceTradeMode) {
        logger.info('No signals from analysis, but force-trade mode active — proceeding to decision stage');
        analysis.marketSentiment = analysis.marketSentiment || 'neutral';
      } else {
        logger.info('No trading opportunities found');
        transitionTo('idle');
        return;
      }
    }

    transitionTo('trading');

    const openOrders = await broker.getOrders('open');
    const recentTradesFromDb = await prisma.trade.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { symbol: true, side: true, quantity: true, price: true, status: true, createdAt: true },
    });

    let decision: TradeDecisionResult | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const prompt = buildDecisionPrompt(balance, positions, analysis, openOrders, recentTradesFromDb, instructionsBlock);
      const response = await ai.analyze(prompt, {
        systemPrompt: ai.isLocal ? TRADE_DECISION_COMPACT_PROMPT : TRADE_DECISION_SYSTEM_PROMPT,
        maxTokens: ai.isLocal ? 2048 : 4096,
        temperature: 0.1,
      });

      const parsed = parseTradeDecision(response.content);
      const avgConfidence = parsed && parsed.trades.length > 0
        ? parsed.trades.reduce((sum, t) => sum + (t.confidence || 0), 0) / parsed.trades.length
        : 0;

      await prisma.aIAnalysis.create({
        data: {
          provider: response.provider.toUpperCase() as any,
          model: response.model,
          analysisType: 'TRADE_DECISION',
          inputData: { analysisResult: analysis } as any,
          outputData: (response.parsed || {}) as any,
          reasoning: response.content.slice(0, 2000),
          confidence: avgConfidence,
          tokensUsed: response.tokensUsed,
          latencyMs: response.latencyMs,
          costUsd: ai.estimateCost(response.tokensUsed.input, response.tokensUsed.output).toFixed(6),
        },
      });

      if (parsed) {
        decision = parsed;
        break;
      }
      logger.warn({ attempt }, 'Failed to parse trade decision, retrying');
    }

    if (!decision || decision.trades.length === 0) {
      logger.info('No trades recommended');
      transitionTo('idle');
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTrades = await prisma.trade.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { totalCost: true },
    });

    const symbolsWithPendingOrders = new Set(openOrders.map((o) => o.symbol));

    for (const trade of decision.trades) {
      if (trade.action === 'hold') continue;

      if (symbolsWithPendingOrders.has(trade.symbol)) {
        logger.info({ symbol: trade.symbol }, 'Skipped: already has pending order');
        continue;
      }

      const proposal: TradeProposal = {
        symbol: trade.symbol,
        side: trade.action as 'buy' | 'sell',
        quantity: trade.quantity,
        orderType: trade.orderType,
        limitPrice: trade.limitPrice,
        stopLossPrice: trade.stopLossPrice,
        takeProfitPrice: trade.takeProfitPrice,
        confidence: trade.confidence,
        reasoning: trade.reasoning,
      };

      const risk = validateTrade(proposal, balance, positions, todayTrades);
      if (!risk.approved) {
        logger.info({ symbol: trade.symbol, reasons: risk.rejectionReasons }, 'Trade rejected');
        continue;
      }

      try {
        const order = await broker.submitOrder({
          symbol: trade.symbol,
          side: trade.action as 'buy' | 'sell',
          type: trade.orderType,
          quantity: trade.quantity,
          limitPrice: trade.limitPrice,
          timeInForce: 'day',
          stopLossPrice: trade.stopLossPrice,
          takeProfitPrice: trade.takeProfitPrice,
        });

        const quote = await broker.getQuote(trade.symbol).catch(() => null);
        const estimatedPrice = order.filledPrice || order.price || quote?.lastPrice || '0';
        const qty = parseFloat(trade.quantity);
        const price = parseFloat(estimatedPrice);

        const dbTrade = await prisma.trade.create({
          data: {
            brokerTradeId: order.brokerOrderId,
            symbol: trade.symbol,
            side: trade.action.toUpperCase() as any,
            quantity: trade.quantity,
            price: estimatedPrice,
            totalCost: (qty * price).toFixed(2),
            status: order.status === 'filled' ? 'FILLED' : 'PENDING',
            orderType: trade.orderType.toUpperCase() as any,
            isPaper: broker.isPaperTrading(),
          },
        });

        symbolsWithPendingOrders.add(trade.symbol);
        eventBus.emit('trade_executed', dbTrade);
        logger.info({ symbol: trade.symbol, side: trade.action, quantity: trade.quantity, price: estimatedPrice }, 'Trade executed');
      } catch (err) {
        trackError('trade_execution', err, { symbol: trade.symbol, side: trade.action });
      }
    }

    transitionTo('idle');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const friendlyMessage = classifyPipelineError(message, err);
    trackError('agent_pipeline', err);
    transitionTo('error', friendlyMessage);
  }
}

async function gatherMarketData(symbols: string[]): Promise<MarketDataPackage[]> {
  const broker = requireBroker();
  const end = new Date();
  const dailyStart = new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000);
  const intradayStart = new Date(end.getTime() - 5 * 24 * 60 * 60 * 1000);

  const results: MarketDataPackage[] = [];
  for (const symbol of symbols) {
    try {
      const [dailyBars, intradayBars, quote] = await Promise.all([
        broker.getBars(symbol, '1day', dailyStart, end),
        broker.getBars(symbol, '15min', intradayStart, end).catch(() => []),
        broker.getQuote(symbol),
      ]);
      const indicators = calculateIndicators(dailyBars);
      const intradayIndicators = calculateIndicators(intradayBars);

      const merged: MarketDataPackage = {
        symbol,
        bars: dailyBars.slice(-30),
        quote,
        indicators: {
          ...indicators,
          vwap: intradayIndicators.vwap ?? indicators.vwap,
        },
        fetchedAt: new Date().toISOString(),
      };
      results.push(merged);
    } catch (err) {
      trackError('market_data', err, { symbol });
    }
  }
  return results;
}

function buildAnalysisPrompt(balance: Balance, positions: Position[], marketData: MarketDataPackage[], instructionsBlock: string): string {
  const symbolSummaries = marketData.map((md) => {
    const bars = md.bars;
    const price = parseFloat(md.quote.lastPrice);
    const prevClose = bars.length >= 2 ? parseFloat(bars[bars.length - 2].close) : price;
    const dayChange = ((price - prevClose) / prevClose * 100).toFixed(2);
    const weekAgo = bars.length >= 6 ? parseFloat(bars[bars.length - 6].close) : price;
    const weekChange = ((price - weekAgo) / weekAgo * 100).toFixed(2);
    const ind = md.indicators;

    let trend = 'neutral';
    if (ind.sma20 && ind.sma50) {
      if (price > ind.sma20 && ind.sma20 > ind.sma50) trend = 'bullish';
      else if (price < ind.sma20 && ind.sma20 < ind.sma50) trend = 'bearish';
    }

    return `${md.symbol}: $${price.toFixed(2)} (day ${dayChange}%, week ${weekChange}%) trend=${trend} | RSI=${ind.rsi14?.toFixed(0) ?? '?'} MACD_hist=${ind.macd?.histogram.toFixed(3) ?? '?'} BB=[${ind.bollingerBands ? `${ind.bollingerBands.lower.toFixed(1)}-${ind.bollingerBands.upper.toFixed(1)}` : '?'}] SMA20=${ind.sma20?.toFixed(1) ?? '?'} SMA50=${ind.sma50?.toFixed(1) ?? '?'} VWAP=${ind.vwap?.toFixed(1) ?? '?'}`;
  }).join('\n');

  return `PORTFOLIO:
Value: $${balance.totalValue} | Cash: $${balance.cashBalance} | Day P&L: $${balance.dayPnL} (${balance.dayPnLPercent}%) | Positions: ${positions.length}

HELD POSITIONS:
${positions.map((p) => {
  const pnlPct = parseFloat(p.unrealizedPnLPercent) * 100;
  return `${p.symbol}: ${p.quantity} @ $${p.avgEntryPrice} → $${p.currentPrice} | P&L $${p.unrealizedPnL} (${pnlPct.toFixed(1)}%)${p.stopLossPrice ? ` | SL $${p.stopLossPrice}` : ''}`;
}).join('\n') || 'None'}
${instructionsBlock}
MARKET DATA (sorted by opportunity):
${symbolSummaries}

Identify actionable trading opportunities. Be aggressive — find setups to BUY and existing positions to SELL for profit or cut for loss.
IMPORTANT: You MUST identify at least 1 bullish OR 1 bearish signal. Saying "no opportunities" is NOT acceptable — look harder at RSI extremes, MACD divergences, positions to trim/exit, or mean-reversion setups.${!isMarketOpen() ? '\nNote: Market is currently CLOSED. Focus on limit order setups for the next open and position management.' : ''}`;
}

function buildDecisionPrompt(
  balance: Balance,
  positions: Position[],
  analysis: MarketAnalysisResult,
  openOrders: Order[],
  recentTrades: { symbol: string; side: string; quantity: string; price: string; status: string; createdAt: Date }[],
  instructionsBlock: string,
): string {
  const pendingOrdersSummary = openOrders.length > 0
    ? openOrders.map((o) => `${o.side.toUpperCase()} ${o.quantity} ${o.symbol} @ ${o.price} (${o.status})`).join('\n')
    : 'None';

  const recentTradesSummary = recentTrades.length > 0
    ? recentTrades.map((t) => `${t.side} ${t.quantity} ${t.symbol} @ $${t.price} [${t.status}]`).join('\n')
    : 'None';

  const positionActions = positions.map((p) => {
    const pnlPct = parseFloat(p.unrealizedPnLPercent) * 100;
    let signal = '';
    if (pnlPct >= 3) signal = ' → TAKE PROFIT candidate';
    else if (pnlPct <= -2) signal = ' → CUT LOSS candidate';
    return `${p.symbol}: ${p.quantity} shares, entry $${p.avgEntryPrice}, now $${p.currentPrice}, P&L ${pnlPct.toFixed(1)}%${signal}`;
  }).join('\n') || 'None';

  const cashPct = (parseFloat(balance.cashBalance) / parseFloat(balance.totalValue) * 100).toFixed(0);

  return `PORTFOLIO: $${balance.totalValue} | Cash: $${balance.cashBalance} (${cashPct}%) | Buying Power: $${balance.buyingPower}

POSITIONS (review each — sell winners, cut losers):
${positionActions}

PENDING ORDERS (DO NOT duplicate these):
${pendingOrdersSummary}

RECENT 24H TRADES:
${recentTradesSummary}

ANALYSIS: ${analysis.marketSentiment} sentiment, ${(analysis.overallConfidence * 100).toFixed(0)}% confidence

BULLISH:
${analysis.bullishSymbols.map((s) => `${s.symbol} (${(s.confidence * 100).toFixed(0)}%): ${s.reason}`).join('\n') || 'None'}

BEARISH:
${analysis.bearishSymbols.map((s) => `${s.symbol} (${(s.confidence * 100).toFixed(0)}%): ${s.reason}`).join('\n') || 'None'}

Risks: ${analysis.riskFactors.join(', ') || 'None'}
${instructionsBlock}
CONSTRAINTS: Max 10% per position | 20% min cash reserve | Max 10 positions | Stop loss required (2-4% below) | Max 5% daily loss

ACTION REQUIRED:
1. Review each position above — take profit on winners (>=3%), cut losers (<=-2%)
2. Find new entries from bullish signals
3. DO NOT duplicate pending orders
4. Calculate quantity: (portfolio_value * 0.07) / stock_price = shares to buy
5. Recommend at least 1 trade per cycle`;
}

async function syncPendingOrders(broker: IBrokerAdapter): Promise<void> {
  const pendingTrades = await prisma.trade.findMany({
    where: { status: 'PENDING', brokerTradeId: { not: null } },
  });

  for (const trade of pendingTrades) {
    try {
      const order = await broker.getOrder(trade.brokerTradeId!);
      if (order.status !== 'pending') {
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            status: order.status.toUpperCase().replace('PARTIALLY_', 'PARTIALLY_') as any,
            price: order.filledPrice || trade.price,
            totalCost: order.filledPrice
              ? (parseFloat(order.filledQuantity) * parseFloat(order.filledPrice)).toFixed(2)
              : trade.totalCost,
            filledAt: order.filledAt ? new Date(order.filledAt) : undefined,
          },
        });
        logger.info({ symbol: trade.symbol, status: order.status }, 'Order status synced');
      }
    } catch {
      // Order may no longer exist on broker side
    }
  }
}

async function takePortfolioSnapshot(balance: Balance): Promise<void> {
  await prisma.portfolioSnapshot.create({
    data: {
      totalValue: balance.totalValue,
      cashBalance: balance.cashBalance,
      investedValue: balance.investedValue,
      dayPnL: balance.dayPnL,
      totalPnL: balance.totalPnL,
    },
  });
}

async function handleDeath(balance: Balance, positions: Position[]): Promise<void> {
  logger.error({ balance: balance.totalValue }, 'AGENT DEATH - Balance depleted');
  transitionTo('dead');

  const broker = requireBroker();
  for (const pos of positions) {
    try {
      await broker.submitOrder({
        symbol: pos.symbol,
        side: 'sell',
        type: 'market',
        quantity: pos.quantity,
        timeInForce: 'day',
        stopLossPrice: undefined,
      });
    } catch (err) {
      logger.error({ err, symbol: pos.symbol }, 'Failed to liquidate position on death');
    }
  }

  const orders = await broker.getOrders('open');
  for (const order of orders) {
    try {
      await broker.cancelOrder(order.id);
    } catch (err) {
      logger.error({ err, orderId: order.id }, 'Failed to cancel order on death');
    }
  }

  eventBus.emit('agent_death', {
    finalBalance: balance.totalValue,
    totalTrades: await prisma.trade.count(),
    totalPnL: balance.totalPnL,
    lifespan: 0,
    reason: 'Balance depleted to zero',
  });
}

function classifyPipelineError(message: string, err: unknown): string {
  const stack = err instanceof Error ? err.stack || '' : '';
  const lower = message.toLowerCase();

  if (lower.includes('fetch failed') || lower.includes('econnrefused') || lower.includes('etimedout') || lower.includes('enotfound')) {
    if (stack.includes('alpaca') || stack.includes('broker') || message.includes('alpaca')) {
      return `[Broker] Cannot reach Alpaca API — check your internet connection or Alpaca may be experiencing an outage.`;
    }
    if (stack.includes('ollama') || stack.includes('localhost:11434')) {
      return `[AI Provider] Cannot reach Ollama — is it running? Start it with: ollama serve`;
    }
    if (stack.includes('lmstudio') || stack.includes('localhost:1234')) {
      return `[AI Provider] Cannot reach LM Studio — is the server running?`;
    }
    if (stack.includes('openai') || stack.includes('anthropic') || stack.includes('x.ai') || stack.includes('groq') || stack.includes('googleapis')) {
      return `[AI Provider] Cannot reach the AI service — check your internet connection.`;
    }
    return `[Network] Connection failed — check your internet connection.`;
  }

  if (lower.includes('api key') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('403')) {
    if (stack.includes('alpaca') || stack.includes('broker')) {
      return `[Broker] Authentication failed — your Alpaca API keys may be invalid or expired. Reconnect in Settings.`;
    }
    return `[AI Provider] Authentication failed — your API key may be invalid or expired. Update it in Settings.`;
  }

  if (lower.includes('rate limit') || lower.includes('429')) {
    return `[AI Provider] Rate limited — too many requests. The agent will retry on the next cycle.`;
  }

  if (lower.includes('model') && lower.includes('not found')) {
    return `[AI Provider] Model not found — the selected model may not be available. Check Settings.`;
  }

  if (lower.includes('no ai provider')) {
    return `[AI Provider] No AI provider configured — go to Settings and connect one.`;
  }

  if (lower.includes('no broker')) {
    return `[Broker] No broker connected — go to Settings and connect your Alpaca API keys.`;
  }

  return `[Agent] ${message}`;
}
