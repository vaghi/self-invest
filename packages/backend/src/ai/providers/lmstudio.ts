import OpenAI from 'openai';
import type { AIProviderType, AIResponse } from '@self-invest/shared';
import type { IAIProvider, AIContext } from '../interface.js';

export class LMStudioProvider implements IAIProvider {
  readonly name: AIProviderType = 'lmstudio';
  readonly isLocal = true;
  private client: OpenAI;

  constructor(public readonly model: string, baseUrl: string) {
    this.client = new OpenAI({
      apiKey: 'lm-studio',
      baseURL: `${baseUrl.replace(/\/$/, '')}/v1`,
    });
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
      const models = await this.client.models.list();
      return models.data.length > 0;
    } catch {
      return false;
    }
  }

  estimateCost(): number {
    return 0;
  }

  private tryParseJson(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
