export type AIProviderType = 'claude' | 'openai' | 'grok' | 'gemini' | 'groq' | 'ollama' | 'lmstudio';
export type AnalysisType = 'market_scan' | 'trade_decision' | 'risk_check' | 'news_digest';

export interface AIProviderConfig {
  type: AIProviderType;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  isLocal: boolean;
  maxTokens: number;
  temperature: number;
}

export interface AIAnalysis {
  id: string;
  provider: AIProviderType;
  model: string;
  analysisType: AnalysisType;
  inputSummary: string;
  reasoning: string;
  confidence: number;
  tokensUsed: { input: number; output: number };
  latencyMs: number;
  costUsd: string;
  createdAt: string;
}

export interface MarketAnalysisResult {
  bullishSymbols: Array<{ symbol: string; reason: string; confidence: number }>;
  bearishSymbols: Array<{ symbol: string; reason: string; confidence: number }>;
  marketSentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  keyEvents: string[];
  riskFactors: string[];
  overallConfidence: number;
}

export interface TradeDecisionResult {
  trades: Array<{
    symbol: string;
    action: 'buy' | 'sell' | 'hold';
    quantity: string;
    orderType: 'market' | 'limit';
    limitPrice?: string;
    stopLossPrice: string;
    takeProfitPrice?: string;
    confidence: number;
    reasoning: string;
  }>;
  portfolioAssessment: string;
  marketOutlook: string;
}

export interface AIResponse {
  content: string;
  parsed: unknown;
  tokensUsed: { input: number; output: number };
  latencyMs: number;
  provider: AIProviderType;
  model: string;
}

export const AI_PROVIDER_MODELS: Record<AIProviderType, string[]> = {
  claude: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4.1', 'gpt-4o-mini'],
  grok: ['grok-4.20-reasoning', 'grok-3', 'grok-3-mini'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
  ollama: ['llama3.2:1b', 'mistral-nemo', 'llama3.1:70b', 'llama3.1:8b', 'mixtral:8x7b', 'phi3:medium'],
  lmstudio: ['loaded-model'],
};
