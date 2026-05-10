import { prisma } from '../db/client.js';
import { requireAIProvider } from '../ai/factory.js';
import { getActiveBroker } from '../broker/factory.js';
import { validateTrade } from '../risk/manager.js';
import { getRiskConfig } from '../risk/manager.js';
import { CHAT_CLASSIFICATION_SYSTEM_PROMPT, STOCK_DISCOVERY_SYSTEM_PROMPT } from '../ai/prompts/chat-templates.js';
import { parseJsonFromAI } from '../ai/response-parser.js';
import { triggerAnalysis } from '../agent/scheduler.js';
import { eventBus } from './event-bus.js';
import { trackError } from './error-tracker.js';
import { logger } from '../config/logger.js';
import type { ChatMessage, UserInstruction, ChatSendResponse } from '@self-invest/shared';
import type { TradeProposal } from '@self-invest/shared';

interface ClassificationResult {
  classification: 'persistent_rule' | 'one_time_command' | 'research_command' | 'question';
  response: string;
  rule?: { compact: string; category: string };
  command?: { symbol: string; side: 'buy' | 'sell'; quantity: string; orderType: string };
  research?: { criteria: string; addToWatchlist: boolean; investImmediately: boolean };
}

interface DiscoveryResult {
  symbols: { symbol: string; reason: string; priceRange?: string; confidence: number }[];
  thesis?: string;
  timeframe?: string;
  riskLevel?: string;
}

export async function processChatMessage(userMessage: string): Promise<ChatSendResponse> {
  const ai = requireAIProvider();

  const userMsg = await prisma.chatMessage.create({
    data: { role: 'USER', content: userMessage },
  });

  let context = '';
  const broker = getActiveBroker();
  if (broker?.isConnected()) {
    try {
      const [balance, positions] = await Promise.all([
        broker.getBalance(),
        broker.getPositions(),
      ]);
      context = `\nCONTEXT:\nPortfolio: $${balance.totalValue} | Cash: $${balance.cashBalance}\nPositions: ${positions.map(p => `${p.symbol}:${p.quantity}@$${p.currentPrice}`).join(', ') || 'None'}`;
    } catch {}
  }

  const prompt = `User message: "${userMessage}"${context}\n\nClassify and respond.`;

  let classification: ClassificationResult;
  try {
    const response = await ai.analyze(prompt, {
      systemPrompt: CHAT_CLASSIFICATION_SYSTEM_PROMPT,
      maxTokens: 1024,
      temperature: 0.1,
    });
    classification = parseClassification(response.content);
  } catch (err) {
    trackError('ai_provider', err, { context: 'chat_classification' });
    const agentMsg = await prisma.chatMessage.create({
      data: { role: 'AGENT', content: 'Sorry, I couldn\'t process that right now. The AI provider may be unavailable.' },
    });
    return { userMessage: mapMsg(userMsg), agentResponse: mapMsg(agentMsg) };
  }

  let instruction: UserInstruction | undefined;
  let tradeAttempted: ChatSendResponse['tradeAttempted'];
  let researchResult: ChatSendResponse['researchResult'];

  switch (classification.classification) {
    case 'persistent_rule': {
      if (classification.rule) {
        const dbInstruction = await prisma.userInstruction.create({
          data: {
            originalMessage: userMessage,
            compactRule: classification.rule.compact,
            category: classification.rule.category,
            status: 'ACTIVE',
          },
        });
        instruction = {
          id: dbInstruction.id,
          originalMessage: dbInstruction.originalMessage,
          compactRule: dbInstruction.compactRule,
          category: dbInstruction.category,
          status: 'active',
          createdAt: dbInstruction.createdAt.toISOString(),
        };
        await prisma.chatMessage.update({
          where: { id: userMsg.id },
          data: { classification: 'PERSISTENT_RULE', instructionId: dbInstruction.id },
        });
      }
      break;
    }
    case 'one_time_command': {
      if (classification.command) {
        tradeAttempted = await executeOneTimeCommand(classification.command);
      }
      await prisma.chatMessage.update({
        where: { id: userMsg.id },
        data: { classification: 'ONE_TIME_COMMAND', metadata: classification.command as any },
      });
      break;
    }
    case 'research_command': {
      if (classification.research) {
        researchResult = await executeResearchCommand(classification.research, userMessage);
      }
      await prisma.chatMessage.update({
        where: { id: userMsg.id },
        data: { classification: 'ONE_TIME_COMMAND', metadata: classification.research as any },
      });
      break;
    }
    case 'question': {
      await prisma.chatMessage.update({
        where: { id: userMsg.id },
        data: { classification: 'QUESTION' },
      });
      break;
    }
  }

  const responseContent = researchResult?.symbols.length
    ? `${classification.response}\n\nDiscovered: ${researchResult.symbols.join(', ')}. ${researchResult.addedToWatchlist ? 'Added to watchlist.' : ''} ${researchResult.pipelineTriggered ? 'Analysis triggered — trades incoming.' : ''}`
    : classification.response;

  const agentMsg = await prisma.chatMessage.create({
    data: {
      role: 'AGENT',
      content: responseContent,
      classification: 'ACKNOWLEDGMENT',
      metadata: tradeAttempted ? (tradeAttempted as any) : researchResult ? (researchResult as any) : undefined,
    },
  });

  const response: ChatSendResponse = {
    userMessage: mapMsg(userMsg),
    agentResponse: mapMsg(agentMsg),
    instruction,
    tradeAttempted,
    researchResult,
  };

  return response;
}

async function executeOneTimeCommand(
  command: { symbol: string; side: 'buy' | 'sell'; quantity: string; orderType: string },
): Promise<ChatSendResponse['tradeAttempted']> {
  const broker = getActiveBroker();
  if (!broker?.isConnected()) {
    return { symbol: command.symbol, side: command.side, status: 'rejected', reason: 'Broker not connected' };
  }

  try {
    let quantity = command.quantity;
    if (quantity === 'all' && command.side === 'sell') {
      const position = await broker.getPosition(command.symbol);
      if (!position) return { symbol: command.symbol, side: 'sell', status: 'rejected', reason: `No position in ${command.symbol}` };
      quantity = position.quantity;
    } else if (quantity === 'all') {
      return { symbol: command.symbol, side: command.side, status: 'rejected', reason: 'Cannot buy "all" — specify a quantity' };
    }

    const balance = await broker.getBalance();
    const positions = await broker.getPositions();
    const riskConfig = getRiskConfig();

    const quote = await broker.getQuote(command.symbol);
    const price = parseFloat(quote.lastPrice);
    const stopLoss = command.side === 'buy' ? (price * (1 - riskConfig.defaultStopLossPct / 100)).toFixed(2) : '0';

    const proposal: TradeProposal = {
      symbol: command.symbol,
      side: command.side,
      quantity,
      orderType: command.orderType as any,
      stopLossPrice: stopLoss,
      confidence: 1.0,
      reasoning: `User command via chat`,
    };

    const risk = validateTrade(proposal, balance, positions, []);
    if (!risk.approved) {
      return { symbol: command.symbol, side: command.side, status: 'rejected', reason: risk.rejectionReasons.join('; ') };
    }

    await broker.submitOrder({
      symbol: command.symbol,
      side: command.side,
      type: command.orderType as any,
      quantity,
      timeInForce: 'day',
      stopLossPrice: command.side === 'buy' ? stopLoss : undefined,
    });

    const dbTrade = await prisma.trade.create({
      data: {
        symbol: command.symbol,
        side: command.side.toUpperCase() as any,
        quantity,
        price: String(price),
        totalCost: (parseFloat(quantity) * price).toFixed(2),
        status: 'PENDING',
        orderType: command.orderType.toUpperCase() as any,
        isPaper: broker.isPaperTrading(),
      },
    });

    eventBus.emit('trade_executed', dbTrade);

    return { symbol: command.symbol, side: command.side, status: 'submitted' };
  } catch (err: any) {
    trackError('trade_execution', err, { context: 'chat_command', symbol: command.symbol });
    return { symbol: command.symbol, side: command.side, status: 'rejected', reason: err.message };
  }
}

async function executeResearchCommand(
  research: { criteria: string; addToWatchlist: boolean; investImmediately: boolean },
  originalMessage: string,
): Promise<ChatSendResponse['researchResult']> {
  try {
    const ai = requireAIProvider();

    // Build exclusion list from current watchlist + positions
    const existingSymbols = new Set<string>();
    const WATCHLIST_FULL = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
      'SPY', 'QQQ', 'IWM', 'AMD', 'NFLX', 'CRM', 'UBER', 'SQ',
      'COIN', 'PLTR', 'SNAP', 'ROKU', 'SHOP',
    ];
    for (const s of WATCHLIST_FULL) existingSymbols.add(s);

    const watchlistInstructions = await prisma.userInstruction.findMany({
      where: { status: 'ACTIVE', category: 'watchlist' },
    });
    for (const inst of watchlistInstructions) {
      const rule = inst.compactRule.toUpperCase();
      if (rule.startsWith('ADD:')) {
        for (const s of rule.replace('ADD:', '').trim().split(/[\s,]+/)) {
          if (s) existingSymbols.add(s);
        }
      }
    }

    const broker = getActiveBroker();
    if (broker?.isConnected()) {
      try {
        const positions = await broker.getPositions();
        for (const p of positions) existingSymbols.add(p.symbol.toUpperCase());
      } catch {}
    }

    const excludeList = [...existingSymbols].join(', ');

    const prompt = `RESEARCH CRITERIA: ${research.criteria}

User's original request: "${originalMessage}"

ALREADY ON WATCHLIST (do NOT recommend these): ${excludeList}

Find 5-10 specific REAL stock tickers that match this criteria. They must be DIFFERENT from the stocks listed above. Consider current market conditions, geopolitical factors, sector trends, and company fundamentals. Every symbol must be a real ticker tradeable on NYSE or NASDAQ.`;

    const response = await ai.analyze(prompt, {
      systemPrompt: STOCK_DISCOVERY_SYSTEM_PROMPT,
      maxTokens: ai.isLocal ? 2048 : 4096,
      temperature: 0.3,
    });

    const discovery = parseDiscoveryResult(response.content);
    if (!discovery || discovery.symbols.length === 0) {
      logger.warn('Stock discovery returned no results');
      return { symbols: [], addedToWatchlist: false, pipelineTriggered: false };
    }

    let tickers = discovery.symbols.map((s) => s.symbol.toUpperCase());

    // Filter out placeholders, already-watched symbols, and invalid-looking tickers
    tickers = tickers.filter((t) => {
      if (existingSymbols.has(t)) return false;
      if (/^(TICKER|STOCK|EXAMPLE|SYMBOL)\d*$/i.test(t)) return false;
      if (t.length > 5 || t.length === 0) return false;
      if (!/^[A-Z]+$/.test(t)) return false;
      return true;
    });

    // Validate against broker — only keep symbols that actually exist
    if (broker?.isConnected() && tickers.length > 0) {
      const validated: string[] = [];
      for (const symbol of tickers) {
        try {
          await broker.getQuote(symbol);
          validated.push(symbol);
        } catch {
          logger.warn({ symbol }, 'Discovered symbol is not tradeable on broker, skipping');
        }
      }
      tickers = validated;
    }

    if (tickers.length === 0) {
      logger.warn('No valid tickers after validation');
      return { symbols: [], addedToWatchlist: false, pipelineTriggered: false };
    }

    logger.info({ tickers, criteria: research.criteria }, 'Stock discovery completed');

    await prisma.aIAnalysis.create({
      data: {
        provider: response.provider.toUpperCase() as any,
        model: response.model,
        analysisType: 'MARKET_SCAN',
        inputData: { criteria: research.criteria, originalMessage } as any,
        outputData: discovery as any,
        reasoning: `Stock discovery: ${discovery.thesis || research.criteria}`,
        confidence: discovery.symbols.reduce((sum, s) => sum + s.confidence, 0) / discovery.symbols.length,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
        costUsd: ai.estimateCost(response.tokensUsed.input, response.tokensUsed.output).toFixed(6),
      },
    });

    let addedToWatchlist = false;
    if (research.addToWatchlist && tickers.length > 0) {
      await prisma.userInstruction.create({
        data: {
          originalMessage: `[Auto-discovered] ${originalMessage}`,
          compactRule: `ADD: ${tickers.join(' ')}`,
          category: 'watchlist',
          status: 'ACTIVE',
        },
      });
      addedToWatchlist = true;
      logger.info({ tickers }, 'Research results added to watchlist');
    }

    let pipelineTriggered = false;
    if (research.investImmediately) {
      try {
        await triggerAnalysis();
        pipelineTriggered = true;
      } catch (err) {
        logger.warn({ err }, 'Could not trigger immediate analysis after research');
      }
    }

    return { symbols: tickers, addedToWatchlist, pipelineTriggered };
  } catch (err) {
    trackError('stock_discovery', err, { criteria: research.criteria });
    return { symbols: [], addedToWatchlist: false, pipelineTriggered: false };
  }
}

function parseDiscoveryResult(content: string): DiscoveryResult | null {
  const json = parseJsonFromAI(content);
  if (json && typeof json === 'object' && 'symbols' in (json as any)) return json as DiscoveryResult;
  return null;
}

function parseClassification(content: string): ClassificationResult {
  const json = parseJsonFromAI(content);
  if (json && typeof json === 'object' && 'classification' in (json as any)) return json as ClassificationResult;
  return { classification: 'question', response: content };
}

function mapMsg(msg: any): ChatMessage {
  return {
    id: msg.id,
    role: msg.role.toLowerCase() as any,
    content: msg.content,
    classification: msg.classification?.toLowerCase().replace(/_/g, '_') as any,
    metadata: msg.metadata ?? undefined,
    instructionId: msg.instructionId ?? undefined,
    createdAt: msg.createdAt.toISOString(),
  };
}

export async function getActiveInstructionsBlock(): Promise<string> {
  const instructions = await prisma.userInstruction.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  if (instructions.length === 0) return '';

  const lines = instructions.map(i => `- ${i.compactRule} [${i.category}]`);
  return `\nUSER INSTRUCTIONS (MUST OBEY — these override default behavior):\n${lines.join('\n')}\n`;
}
