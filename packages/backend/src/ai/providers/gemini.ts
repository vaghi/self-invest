import OpenAI from 'openai';
import type { AIProviderType, AIResponse } from '@self-invest/shared';
import type { IAIProvider, AIContext } from '../interface.js';
import { trackError } from '../../services/error-tracker.js';

export class GeminiProvider implements IAIProvider {
  readonly name: AIProviderType = 'gemini';
  readonly isLocal = false;
  private client: OpenAI;

  constructor(public readonly model: string, apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
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
      await this.client.models.list();
      return true;
    } catch (err) {
      trackError('ai_provider', err, { provider: 'gemini', model: this.model, context: 'health_check' });
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
      const match = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[1] || match[0]);
      return null;
    }
  }
}
