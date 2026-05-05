import Anthropic from '@anthropic-ai/sdk';
import type { AIProviderType, AIResponse } from '@self-invest/shared';
import type { IAIProvider, AIContext } from '../interface.js';

export class ClaudeProvider implements IAIProvider {
  readonly name: AIProviderType = 'claude';
  readonly isLocal = false;
  private client: Anthropic;

  constructor(public readonly model: string, apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyze(prompt: string, context: AIContext): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: context.maxTokens,
      temperature: context.temperature,
      system: context.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });
    const latencyMs = Date.now() - start;
    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    return {
      content,
      parsed: this.tryParseJson(content),
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      latencyMs,
      provider: this.name,
      model: this.model,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.messages.create({
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
      'claude-sonnet-4-6': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
      'claude-opus-4-6': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
      'claude-haiku-4-5-20251001': { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
    };
    const cost = costs[this.model] || costs['claude-sonnet-4-6'];
    return inputTokens * cost.input + outputTokens * cost.output;
  }

  private tryParseJson(content: string): unknown {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      return null;
    } catch {
      return null;
    }
  }
}
