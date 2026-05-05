import type {
  Balance, Position, MarketDataPackage, TradeProposal,
  MarketAnalysisResult, TradeDecisionResult,
} from '@self-invest/shared';
import { requireBroker } from '../broker/factory.js';
import { requireAIProvider } from '../ai/factory.js';
import { MARKET_ANALYSIS_SYSTEM_PROMPT, TRADE_DECISION_SYSTEM_PROMPT } from '../ai/prompts/templates.js';
import { parseMarketAnalysis, parseTradeDecision } from '../ai/response-parser.js';
import { validateTrade, checkDeathCondition } from '../risk/manager.js';
import { calculateIndicators } from '../market-data/indicators/technical.js';
import { transitionTo, isDead } from './state-machine.js';
import { prisma } from '../db/client.js';
import { eventBus } from '../services/event-bus.js';
import { logger } from '../config/logger.js';

const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'SPY', 'QQQ', 'IWM'];
const MAX_RETRIES = 3;

export async function runPipeline(): Promise<void> {
  if (isDead()) {
    logger.warn('Agent is dead, skipping pipeline');
    return;
  }

  try {
    transitionTo('analyzing');
    const broker = requireBroker();
    const ai = requireAIProvider();

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
    const watchlist = [...new Set([...DEFAULT_WATCHLIST, ...heldSymbols])];

    const marketData = await gatherMarketData(watchlist);

    let analysis: MarketAnalysisResult | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const prompt = buildAnalysisPrompt(balance, positions, marketData);
      const response = await ai.analyze(prompt, {
        systemPrompt: MARKET_ANALYSIS_SYSTEM_PROMPT,
        maxTokens: 4096,
        temperature: 0.2,
      });

      await prisma.aIAnalysis.create({
        data: {
          provider: response.provider.toUpperCase() as any,
          model: response.model,
          analysisType: 'MARKET_SCAN',
          inputData: { watchlist, positionCount: positions.length },
          outputData: response.parsed || {},
          reasoning: response.content.slice(0, 2000),
          confidence: 0,
          tokensUsed: response.tokensUsed,
          latencyMs: response.latencyMs,
          costUsd: ai.estimateCost(response.tokensUsed.input, response.tokensUsed.output).toFixed(6),
        },
      });

      analysis = parseMarketAnalysis(response.content);
      if (analysis) {
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
      logger.info('No trading opportunities found');
      transitionTo('idle');
      return;
    }

    transitionTo('trading');

    let decision: TradeDecisionResult | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const prompt = buildDecisionPrompt(balance, positions, analysis);
      const response = await ai.analyze(prompt, {
        systemPrompt: TRADE_DECISION_SYSTEM_PROMPT,
        maxTokens: 4096,
        temperature: 0.1,
      });

      await prisma.aIAnalysis.create({
        data: {
          provider: response.provider.toUpperCase() as any,
          model: response.model,
          analysisType: 'TRADE_DECISION',
          inputData: { analysisResult: analysis },
          outputData: response.parsed || {},
          reasoning: response.content.slice(0, 2000),
          confidence: 0,
          tokensUsed: response.tokensUsed,
          latencyMs: response.latencyMs,
          costUsd: ai.estimateCost(response.tokensUsed.input, response.tokensUsed.output).toFixed(6),
        },
      });

      decision = parseTradeDecision(response.content);
      if (decision) break;
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

    for (const trade of decision.trades) {
      if (trade.action === 'hold') continue;

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

        const dbTrade = await prisma.trade.create({
          data: {
            brokerTradeId: order.brokerOrderId,
            symbol: trade.symbol,
            side: trade.action.toUpperCase() as any,
            quantity: trade.quantity,
            price: order.price || '0',
            totalCost: '0',
            status: 'PENDING',
            orderType: trade.orderType.toUpperCase() as any,
            isPaper: broker.isPaperTrading(),
          },
        });

        eventBus.emit('trade_executed', dbTrade);
        logger.info({ symbol: trade.symbol, side: trade.action, quantity: trade.quantity }, 'Trade executed');
      } catch (err) {
        logger.error({ err, symbol: trade.symbol }, 'Failed to execute trade');
      }
    }

    transitionTo('idle');
  } catch (err) {
    logger.error({ err }, 'Pipeline error');
    transitionTo('error');
  }
}

async function gatherMarketData(symbols: string[]): Promise<MarketDataPackage[]> {
  const broker = requireBroker();
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const results: MarketDataPackage[] = [];
  for (const symbol of symbols) {
    try {
      const [bars, quote] = await Promise.all([
        broker.getBars(symbol, '1day', start, end),
        broker.getQuote(symbol),
      ]);
      const indicators = calculateIndicators(bars);
      results.push({ symbol, bars: bars.slice(-30), quote, indicators, fetchedAt: new Date().toISOString() });
    } catch (err) {
      logger.warn({ err, symbol }, 'Failed to fetch market data');
    }
  }
  return results;
}

function buildAnalysisPrompt(balance: Balance, positions: Position[], marketData: MarketDataPackage[]): string {
  const symbolSummaries = marketData.map((md) => {
    const lastBar = md.bars[md.bars.length - 1];
    return `${md.symbol}: Price $${md.quote.lastPrice}, RSI=${md.indicators.rsi14?.toFixed(1) ?? 'N/A'}, ` +
      `MACD=${md.indicators.macd ? md.indicators.macd.histogram.toFixed(3) : 'N/A'}, ` +
      `SMA20=$${md.indicators.sma20?.toFixed(2) ?? 'N/A'}, SMA50=$${md.indicators.sma50?.toFixed(2) ?? 'N/A'}, ` +
      `BB=[${md.indicators.bollingerBands ? `${md.indicators.bollingerBands.lower.toFixed(2)}-${md.indicators.bollingerBands.upper.toFixed(2)}` : 'N/A'}]`;
  }).join('\n');

  return `PORTFOLIO STATE:
Total Value: $${balance.totalValue}
Cash: $${balance.cashBalance}
Day P&L: $${balance.dayPnL} (${balance.dayPnLPercent}%)
Open Positions: ${positions.length}

CURRENT POSITIONS:
${positions.map((p) => `${p.symbol}: ${p.quantity} shares @ $${p.avgEntryPrice}, current $${p.currentPrice}, P&L $${p.unrealizedPnL}`).join('\n') || 'None'}

MARKET DATA:
${symbolSummaries}

Analyze these markets and identify trading opportunities.`;
}

function buildDecisionPrompt(balance: Balance, positions: Position[], analysis: MarketAnalysisResult): string {
  return `PORTFOLIO STATE:
Total Value: $${balance.totalValue}
Available Cash: $${balance.cashBalance}
Buying Power: $${balance.buyingPower}

CURRENT POSITIONS:
${positions.map((p) => `${p.symbol}: ${p.quantity} shares, entry $${p.avgEntryPrice}, current $${p.currentPrice}, P&L $${p.unrealizedPnL}`).join('\n') || 'None'}

MARKET ANALYSIS:
Sentiment: ${analysis.marketSentiment}
Overall Confidence: ${(analysis.overallConfidence * 100).toFixed(0)}%

Bullish Opportunities:
${analysis.bullishSymbols.map((s) => `- ${s.symbol} (${(s.confidence * 100).toFixed(0)}%): ${s.reason}`).join('\n') || 'None'}

Bearish Signals:
${analysis.bearishSymbols.map((s) => `- ${s.symbol} (${(s.confidence * 100).toFixed(0)}%): ${s.reason}`).join('\n') || 'None'}

Risk Factors: ${analysis.riskFactors.join(', ') || 'None identified'}

RISK CONSTRAINTS:
- Max 10% of portfolio per position
- Must maintain 20% cash reserve
- Max 10 open positions
- Every buy must have a stop loss (min 3% below entry)
- Max 5% daily loss allowed

Based on this analysis, recommend specific trades.`;
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
