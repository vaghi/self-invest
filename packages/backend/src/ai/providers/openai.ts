import OpenAI from 'openai';
import type { AIProviderType, AIResponse } from '@self-invest/shared';
import type { IAIProvider, AIContext } from '../interface.js';

export class OpenAIProvider implements IAIProvider {
  readonly name: AIProviderType = 'openai';
  readonly isLocal = false;
  private client: OpenAI;

  constructor(public readonly model: string, apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyze(prompt: string, context: AIContext): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: context.maxTokens,
      temperature: context.temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: context.systemPrompt },
        { role: 'user', content: prompt },
      ],
    });
    const latencyMs = Date.now() - start;
    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      parsed: this.tryParseJson(content),
      tokensUsed: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      },
      latencyMs,
      provider: this.name,
      model: this.model,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
      'gpt-4.1': { input: 2 / 1_000_000, output: 8 / 1_000_000 },
      'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    };
    const cost = costs[this.model] || costs['gpt-4o'];
    return inputTokens * cost.input + outputTokens * cost.output;
  }

  private tryParseJson(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
