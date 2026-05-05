import type { AIProviderType } from '@self-invest/shared';
import type { IAIProvider } from './interface.js';
import { ClaudeProvider } from './providers/claude.js';
import { OpenAIProvider } from './providers/openai.js';
import { GrokProvider } from './providers/grok.js';
import { OllamaProvider } from './providers/ollama.js';
import { LMStudioProvider } from './providers/lmstudio.js';
import { env } from '../config/env.js';

let activeProvider: IAIProvider | null = null;

export function createAIProvider(type: AIProviderType, model: string): IAIProvider {
  switch (type) {
    case 'claude': {
      if (!env.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');
      activeProvider = new ClaudeProvider(model, env.anthropicApiKey);
      break;
    }
    case 'openai': {
      if (!env.openaiApiKey) throw new Error('OPENAI_API_KEY not configured');
      activeProvider = new OpenAIProvider(model, env.openaiApiKey);
      break;
    }
    case 'grok': {
      if (!env.xaiApiKey) throw new Error('XAI_API_KEY not configured');
      activeProvider = new GrokProvider(model, env.xaiApiKey);
      break;
    }
    case 'ollama': {
      activeProvider = new OllamaProvider(model, env.ollamaBaseUrl);
      break;
    }
    case 'lmstudio': {
      activeProvider = new LMStudioProvider(model, env.lmstudioBaseUrl);
      break;
    }
    default:
      throw new Error(`Unknown AI provider: ${type}`);
  }
  return activeProvider;
}

export function getActiveAIProvider(): IAIProvider | null {
  return activeProvider;
}

export function requireAIProvider(): IAIProvider {
  if (!activeProvider) {
    throw new Error('No AI provider configured. Go to Settings to select one.');
  }
  return activeProvider;
}
