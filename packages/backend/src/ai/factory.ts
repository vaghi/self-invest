import type { AIProviderType } from '@self-invest/shared';
import type { IAIProvider } from './interface.js';
import { ClaudeProvider } from './providers/claude.js';
import { OpenAIProvider } from './providers/openai.js';
import { GrokProvider } from './providers/grok.js';
import { GeminiProvider } from './providers/gemini.js';
import { GroqProvider } from './providers/groq.js';
import { OllamaProvider } from './providers/ollama.js';
import { LMStudioProvider } from './providers/lmstudio.js';
import { env } from '../config/env.js';

let activeProvider: IAIProvider | null = null;

export function createAIProvider(type: AIProviderType, model: string, apiKey?: string): IAIProvider {
  switch (type) {
    case 'claude': {
      const key = apiKey || env.anthropicApiKey;
      if (!key) throw new Error('Anthropic API key not configured. Provide it in Settings or set ANTHROPIC_API_KEY in .env');
      activeProvider = new ClaudeProvider(model, key);
      break;
    }
    case 'openai': {
      const key = apiKey || env.openaiApiKey;
      if (!key) throw new Error('OpenAI API key not configured. Provide it in Settings or set OPENAI_API_KEY in .env');
      activeProvider = new OpenAIProvider(model, key);
      break;
    }
    case 'grok': {
      const key = apiKey || env.xaiApiKey;
      if (!key) throw new Error('xAI API key not configured. Provide it in Settings or set XAI_API_KEY in .env');
      activeProvider = new GrokProvider(model, key);
      break;
    }
    case 'gemini': {
      const key = apiKey;
      if (!key) throw new Error('Google Gemini API key not configured. Get one free at aistudio.google.com/apikey');
      activeProvider = new GeminiProvider(model, key);
      break;
    }
    case 'groq': {
      const key = apiKey;
      if (!key) throw new Error('Groq API key not configured. Get one free at console.groq.com');
      activeProvider = new GroqProvider(model, key);
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

export function clearActiveAIProvider(): void {
  activeProvider = null;
}

export function requireAIProvider(): IAIProvider {
  if (!activeProvider) {
    throw new Error('No AI provider configured. Go to Settings to select one.');
  }
  return activeProvider;
}
