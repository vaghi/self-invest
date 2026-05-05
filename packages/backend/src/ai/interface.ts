import type { AIProviderType, AIResponse } from '@self-invest/shared';

export interface AIContext {
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface IAIProvider {
  readonly name: AIProviderType;
  readonly model: string;
  readonly isLocal: boolean;

  analyze(prompt: string, context: AIContext): Promise<AIResponse>;
  healthCheck(): Promise<boolean>;
  estimateCost(inputTokens: number, outputTokens: number): number;
}
