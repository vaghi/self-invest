import { useState } from 'react';
import { Plug, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { AIProviderType } from '@self-invest/shared';
import { AI_PROVIDER_MODELS } from '@self-invest/shared';
import { useSettingsStore } from '../../stores/settings.store';

const PROVIDER_LABELS: Record<AIProviderType, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'OpenAI',
  grok: 'Grok (xAI)',
  gemini: 'Gemini (Google) - Free',
  groq: 'Groq Cloud - Free',
  ollama: 'Ollama (Local)',
  lmstudio: 'LM Studio (Local)',
};

const LOCAL_PROVIDERS: AIProviderType[] = ['ollama', 'lmstudio'];

export default function AIProviderSelector() {
  const { aiProvider, setAIProvider, loading, aiError: error } = useSettingsStore();

  const [selectedType, setSelectedType] = useState<AIProviderType>(
    aiProvider?.type ?? 'claude',
  );
  const [selectedModel, setSelectedModel] = useState(
    aiProvider?.model ?? AI_PROVIDER_MODELS.claude[0],
  );
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);

  const isLocal = LOCAL_PROVIDERS.includes(selectedType);
  const models = AI_PROVIDER_MODELS[selectedType] ?? [];

  function handleProviderChange(type: AIProviderType) {
    setSelectedType(type);
    setSelectedModel(AI_PROVIDER_MODELS[type][0] ?? '');
    setConnected(false);
  }

  async function handleConnect() {
    try {
      await setAIProvider(selectedType, selectedModel, isLocal ? undefined : apiKey);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        AI Provider
      </h3>

      {/* Currently active provider */}
      {aiProvider && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-600/10 border border-brand-500/20 px-4 py-2.5">
          <CheckCircle className="h-4 w-4 text-brand-400" />
          <span className="text-sm text-brand-400 font-medium">
            Active: {PROVIDER_LABELS[aiProvider.type]} &mdash; {aiProvider.model}
          </span>
        </div>
      )}

      {/* Provider select */}
      <div className="space-y-1.5">
        <label className="block text-xs text-gray-500 font-medium">
          Provider
        </label>
        <select
          value={selectedType}
          onChange={(e) => handleProviderChange(e.target.value as AIProviderType)}
          className="w-full rounded-lg bg-surface-900 border border-surface-700 px-3 pr-8 py-2 text-sm text-gray-200
                     focus:outline-none focus:border-brand-500 transition appearance-none"
        >
          {(Object.keys(PROVIDER_LABELS) as AIProviderType[]).map((type) => (
            <option key={type} value={type}>
              {PROVIDER_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {/* Model select */}
      <div className="space-y-1.5">
        <label className="block text-xs text-gray-500 font-medium">Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full rounded-lg bg-surface-900 border border-surface-700 px-3 pr-8 py-2 text-sm text-gray-200
                     focus:outline-none focus:border-brand-500 transition appearance-none"
        >
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* API key (hidden for local providers) */}
      {!isLocal && (
        <div className="space-y-1.5">
          <label className="block text-xs text-gray-500 font-medium">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200
                       placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Connect button + health indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConnect}
          disabled={loading || (!isLocal && !apiKey)}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white
                     hover:bg-brand-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plug className="h-4 w-4" />
          )}
          Connect
        </button>

        {/* Health status dot */}
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              <span className="text-xs text-green-400">Connected</span>
            </>
          ) : aiProvider ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs text-yellow-400">Previous config active</span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-red-400">Not connected</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
