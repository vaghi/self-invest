import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  MASTER_ENCRYPTION_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  ALPACA_API_KEY: z.string().optional(),
  ALPACA_API_SECRET: z.string().optional(),
  ALPACA_PAPER: z.string().default('true'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  LMSTUDIO_BASE_URL: z.string().default('http://localhost:1234'),
  AGENT_ENABLED: z.string().default('false'),
  AGENT_ANALYSIS_INTERVAL_MINUTES: z.string().default('5'),
  AGENT_MAX_DAILY_AI_COST_USD: z.string().default('10'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: parseInt(parsed.data.PORT),
  nodeEnv: parsed.data.NODE_ENV,
  frontendUrl: parsed.data.FRONTEND_URL,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  masterEncryptionKey: parsed.data.MASTER_ENCRYPTION_KEY,
  anthropicApiKey: parsed.data.ANTHROPIC_API_KEY,
  openaiApiKey: parsed.data.OPENAI_API_KEY,
  xaiApiKey: parsed.data.XAI_API_KEY,
  alpacaApiKey: parsed.data.ALPACA_API_KEY,
  alpacaApiSecret: parsed.data.ALPACA_API_SECRET,
  alpacaPaper: parsed.data.ALPACA_PAPER === 'true',
  ollamaBaseUrl: parsed.data.OLLAMA_BASE_URL,
  lmstudioBaseUrl: parsed.data.LMSTUDIO_BASE_URL,
  agentEnabled: parsed.data.AGENT_ENABLED === 'true',
  agentAnalysisIntervalMinutes: parseInt(parsed.data.AGENT_ANALYSIS_INTERVAL_MINUTES),
  agentMaxDailyAiCostUsd: parseFloat(parsed.data.AGENT_MAX_DAILY_AI_COST_USD),
} as const;
