import OpenAI from 'openai';
import type { AIProviderType, AIResponse } from '@self-invest/shared';
import type { IAIProvider, AIContext } from '../interface.js';

export class GrokProvider implements IAIProvider {
  readonly name: AIProviderType = 'grok';
  readonly isLocal = false;
  private client: OpenAI;

  constructor(public readonly model: string, apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  async analyze(prompt: string, context: AIContext): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: context.maxTokens,
      temperature: context.temperature,
      messages: [
        { role: 'system', content: context.systemPrompt + '\n\nRespond with valid JSON only.' },
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
      'grok-3': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
      'grok-3-mini': { input: 0.3 / 1_000_000, output: 0.5 / 1_000_000 },
    };
    const cost = costs[this.model] || costs['grok-3'];
    return inputTokens * cost.input + outputTokens * cost.output;
  }

  private tryParseJson(content: string): unknown {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      return null;
    } catch {
      return null;
    }
  }
}
