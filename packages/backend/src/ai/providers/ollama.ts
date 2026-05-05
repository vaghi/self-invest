import type { AIProviderType, AIResponse } from '@self-invest/shared';
import type { IAIProvider, AIContext } from '../interface.js';

export class OllamaProvider implements IAIProvider {
  readonly name: AIProviderType = 'ollama';
  readonly isLocal = true;
  private baseUrl: string;

  constructor(public readonly model: string, baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async analyze(prompt: string, context: AIContext): Promise<AIResponse> {
    const start = Date.now();
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
        options: {
          temperature: context.temperature,
          num_predict: context.maxTokens,
        },
        messages: [
          { role: 'system', content: context.systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
    }

    const result = await response.json() as any;
    const content = result.message?.content || '';

    return {
      content,
      parsed: this.tryParseJson(content),
      tokensUsed: {
        input: result.prompt_eval_count || 0,
        output: result.eval_count || 0,
      },
      latencyMs,
      provider: this.name,
      model: this.model,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
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
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    }
  }
}
