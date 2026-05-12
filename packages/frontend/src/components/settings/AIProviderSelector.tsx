import { useState } from 'react';
import { Plug, Loader2, CheckCircle, Plus, X } from 'lucide-react';
import type { AIProviderType } from '@self-invest/shared';
import { AI_PROVIDER_MODELS } from '@self-invest/shared';
import { useSettingsStore } from '../../stores/settings.store';

const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'OpenAI',
  grok: 'Grok (xAI)',
  gemini: 'Gemini (Google) - Free',
  groq: 'Groq Cloud - Free',
  ollama: 'Ollama (Local)',
  lmstudio: 'LM Studio (Local)',
};

const LOCAL_PROVIDERS: string[] = ['ollama', 'lmstudio'];

const CUSTOM_PROVIDERS_KEY = 'self-invest:custom-providers';
const CUSTOM_MODELS_KEY = 'self-invest:custom-models';

interface CustomProvider {
  key: string;
  label: string;
}

function loadCustomProviders(): CustomProvider[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PROVIDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomProviders(providers: CustomProvider[]) {
  localStorage.setItem(CUSTOM_PROVIDERS_KEY, JSON.stringify(providers));
}

function loadCustomModels(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(CUSTOM_MODELS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCustomModels(models: Record<string, string[]>) {
  localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(models));
}

export default function AIProviderSelector() {
  const { aiProvider, setAIProvider, loading, aiError: error } = useSettingsStore();

  const [customProviders, setCustomProviders] = useState<CustomProvider[]>(loadCustomProviders);
  const [customModels, setCustomModels] = useState<Record<string, string[]>>(loadCustomModels);

  const [selectedType, setSelectedType] = useState<string>(
    aiProvider?.type ?? 'claude',
  );
  const [selectedModel, setSelectedModel] = useState(
    aiProvider?.model ?? AI_PROVIDER_MODELS.claude[0],
  );
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);

  // Modal states
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [newProviderKey, setNewProviderKey] = useState('');
  const [newProviderLabel, setNewProviderLabel] = useState('');
  const [newModelId, setNewModelId] = useState('');

  // Merge built-in and custom provider labels
  const allProviderLabels: Record<string, string> = { ...PROVIDER_LABELS };
  customProviders.forEach((cp) => {
    allProviderLabels[cp.key] = cp.label;
  });

  const isLocal = LOCAL_PROVIDERS.includes(selectedType);
  const isCustomProvider = customProviders.some((cp) => cp.key === selectedType);

  // Get models for current provider (merge built-in + custom)
  const builtInModels = (AI_PROVIDER_MODELS as Record<string, string[]>)[selectedType] ?? [];
  const extraModels = customModels[selectedType] ?? [];
  const models = [...builtInModels, ...extraModels];

  function handleProviderChange(type: string) {
    setSelectedType(type);
    const builtIn = (AI_PROVIDER_MODELS as Record<string, string[]>)[type] ?? [];
    const extra = customModels[type] ?? [];
    const all = [...builtIn, ...extra];
    setSelectedModel(all[0] ?? '');
    setConnected(false);
  }

  async function handleConnect() {
    try {
      await setAIProvider(selectedType as AIProviderType, selectedModel, isLocal ? undefined : apiKey);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }

  function handleAddProvider() {
    const key = newProviderKey.trim().toLowerCase().replace(/\s+/g, '-');
    const label = newProviderLabel.trim();
    if (!key || !label) return;
    if (allProviderLabels[key]) return; // already exists

    const updated = [...customProviders, { key, label }];
    setCustomProviders(updated);
    saveCustomProviders(updated);
    setNewProviderKey('');
    setNewProviderLabel('');
    setShowProviderModal(false);
    // Select the newly added provider
    setSelectedType(key);
    setSelectedModel('');
  }

  function handleAddModel() {
    const modelId = newModelId.trim();
    if (!modelId) return;

    const existing = customModels[selectedType] ?? [];
    if (existing.includes(modelId) || builtInModels.includes(modelId)) return;

    const updated = { ...customModels, [selectedType]: [...existing, modelId] };
    setCustomModels(updated);
    saveCustomModels(updated);
    setSelectedModel(modelId);
    setNewModelId('');
    setShowModelModal(false);
  }

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        AI Provider
      </h3>

      {/* Currently active provider */}
      {aiProvider && aiProvider.healthy && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-600/10 border border-brand-500/20 px-4 py-2.5">
          <CheckCircle className="h-4 w-4 text-brand-400" />
          <span className="text-sm text-brand-400 font-medium">
            Active: {allProviderLabels[aiProvider.type] ?? aiProvider.type} &mdash; {aiProvider.model}
          </span>
        </div>
      )}
      {aiProvider && !aiProvider.healthy && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-600/10 border border-yellow-500/20 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <span className="text-sm text-yellow-400 font-medium">
            Unreachable: {allProviderLabels[aiProvider.type] ?? aiProvider.type} &mdash; {aiProvider.model}
          </span>
        </div>
      )}

      {/* Provider select */}
      <div className="space-y-1.5">
        <label className="block text-xs text-gray-500 font-medium">
          Provider
        </label>
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="flex-1 rounded-lg bg-surface-900 border border-surface-700 px-3 pr-8 py-2 text-sm text-gray-200
                       focus:outline-none focus:border-brand-500 transition appearance-none"
          >
            {Object.keys(allProviderLabels).map((type) => (
              <option key={type} value={type}>
                {allProviderLabels[type]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowProviderModal(true)}
            className="flex items-center justify-center h-9 w-9 rounded-lg border border-surface-700 bg-surface-900
                       text-gray-400 hover:text-brand-400 hover:border-brand-500 transition"
            title="Add custom provider"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Model select */}
      <div className="space-y-1.5">
        <label className="block text-xs text-gray-500 font-medium">Model</label>
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-1 rounded-lg bg-surface-900 border border-surface-700 px-3 pr-8 py-2 text-sm text-gray-200
                       focus:outline-none focus:border-brand-500 transition appearance-none"
          >
            {models.length === 0 && (
              <option value="" disabled>No models - add one</option>
            )}
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowModelModal(true)}
            className="flex items-center justify-center h-9 w-9 rounded-lg border border-surface-700 bg-surface-900
                       text-gray-400 hover:text-brand-400 hover:border-brand-500 transition"
            title="Add custom model"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
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
          disabled={loading || (!isLocal && !isCustomProvider && !apiKey) || !selectedModel}
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
          ) : aiProvider && aiProvider.healthy ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-xs text-green-400">Active</span>
            </>
          ) : aiProvider && !aiProvider.healthy ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs text-yellow-400">Unreachable</span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-red-400">Not connected</span>
            </>
          )}
        </div>
      </div>

      {/* Add Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-200">Add Custom Provider</h4>
              <button
                onClick={() => setShowProviderModal(false)}
                className="text-gray-400 hover:text-gray-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-500 font-medium">
                  Provider Key
                </label>
                <input
                  type="text"
                  value={newProviderKey}
                  onChange={(e) => setNewProviderKey(e.target.value)}
                  placeholder="e.g. together, deepseek"
                  className="w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200
                             placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs text-gray-500 font-medium">
                  Display Label
                </label>
                <input
                  type="text"
                  value={newProviderLabel}
                  onChange={(e) => setNewProviderLabel(e.target.value)}
                  placeholder="e.g. Together AI, DeepSeek"
                  className="w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200
                             placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowProviderModal(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProvider}
                disabled={!newProviderKey.trim() || !newProviderLabel.trim()}
                className="px-4 py-1.5 rounded-lg bg-brand-600 text-sm font-medium text-white
                           hover:bg-brand-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {showModelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-200">
                Add Model to {allProviderLabels[selectedType] ?? selectedType}
              </h4>
              <button
                onClick={() => setShowModelModal(false)}
                className="text-gray-400 hover:text-gray-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs text-gray-500 font-medium">
                Model ID
              </label>
              <input
                type="text"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                placeholder="e.g. gpt-4-turbo, llama-3-70b"
                className="w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200
                           placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowModelModal(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddModel}
                disabled={!newModelId.trim()}
                className="px-4 py-1.5 rounded-lg bg-brand-600 text-sm font-medium text-white
                           hover:bg-brand-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
