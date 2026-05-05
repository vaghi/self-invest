import { z } from 'zod';

export const orderRequestSchema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  quantity: z.string().regex(/^\d+(\.\d+)?$/),
  limitPrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  stopPrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  timeInForce: z.enum(['day', 'gtc', 'ioc', 'fok']),
  stopLossPrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  takeProfitPrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
});

export const marketAnalysisResultSchema = z.object({
  bullishSymbols: z.array(z.object({
    symbol: z.string(),
    reason: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  bearishSymbols: z.array(z.object({
    symbol: z.string(),
    reason: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  marketSentiment: z.enum(['bullish', 'bearish', 'neutral', 'mixed']),
  keyEvents: z.array(z.string()),
  riskFactors: z.array(z.string()),
  overallConfidence: z.number().min(0).max(1),
});

export const tradeDecisionResultSchema = z.object({
  trades: z.array(z.object({
    symbol: z.string(),
    action: z.enum(['buy', 'sell', 'hold']),
    quantity: z.string(),
    orderType: z.enum(['market', 'limit']),
    limitPrice: z.string().optional(),
    stopLossPrice: z.string(),
    takeProfitPrice: z.string().optional(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  })),
  portfolioAssessment: z.string(),
  marketOutlook: z.string(),
});

export const brokerCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  isPaperTrading: z.boolean(),
});

export const riskConfigSchema = z.object({
  maxPositionSizePct: z.number().min(1).max(100),
  maxPortfolioDrawdownPct: z.number().min(1).max(100),
  maxDailyLossPct: z.number().min(1).max(100),
  maxOpenPositions: z.number().min(1).max(100),
  defaultStopLossPct: z.number().min(0.5).max(50),
  maxSectorConcentrationPct: z.number().min(5).max(100),
  minCashReservePct: z.number().min(0).max(90),
});

export const aiProviderConfigSchema = z.object({
  type: z.enum(['claude', 'openai', 'grok', 'ollama', 'lmstudio']),
  model: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  maxTokens: z.number().min(100).max(128000).default(4096),
  temperature: z.number().min(0).max(2).default(0.2),
});
