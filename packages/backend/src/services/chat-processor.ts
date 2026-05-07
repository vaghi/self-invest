import { prisma } from '../db/client.js';
import { requireAIProvider } from '../ai/factory.js';
import { getActiveBroker } from '../broker/factory.js';
import { validateTrade } from '../risk/manager.js';
import { getRiskConfig } from '../risk/manager.js';
import { CHAT_CLASSIFICATION_SYSTEM_PROMPT } from '../ai/prompts/chat-templates.js';
import { eventBus } from './event-bus.js';
import { trackError } from './error-tracker.js';
import { logger } from '../config/logger.js';
import type { ChatMessage, UserInstruction, ChatSendResponse } from '@self-invest/shared';
import type { TradeProposal } from '@self-invest/shared';

interface ClassificationResult {
  classification: 'persistent_rule' | 'one_time_command' | 'question';
  response: string;
  rule?: { compact: string; category: string };
  command?: { symbol: string; side: 'buy' | 'sell'; quantity: string; orderType: string };
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
    case 'question': {
      await prisma.chatMessage.update({
        where: { id: userMsg.id },
        data: { classification: 'QUESTION' },
      });
      break;
    }
  }

  const agentMsg = await prisma.chatMessage.create({
    data: {
      role: 'AGENT',
      content: classification.response,
      classification: 'ACKNOWLEDGMENT',
      metadata: tradeAttempted ? (tradeAttempted as any) : undefined,
    },
  });

  const response: ChatSendResponse = {
    userMessage: mapMsg(userMsg),
    agentResponse: mapMsg(agentMsg),
    instruction,
    tradeAttempted,
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

function parseClassification(content: string): ClassificationResult {
  try {
    const json = content.match(/\{[\s\S]*\}/);
    if (json) return JSON.parse(json[0]);
  } catch {}
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
