import { useState } from 'react';
import { Plug, Unplug, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../stores/settings.store';

export default function BrokerConfig() {
  const { brokerConnected, isPaperTrading, connectBroker, disconnectBroker, loading, brokerError: error } =
    useSettingsStore();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [paperTrading, setPaperTrading] = useState(isPaperTrading);

  async function handleConnect() {
    const success = await connectBroker(apiKey, apiSecret, paperTrading);
    if (success) {
      setApiKey('');
      setApiSecret('');
    }
  }

  async function handleDisconnect() {
    await disconnectBroker();
  }

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Broker Connection
      </h3>

      {/* Connection status indicator */}
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            brokerConnected
              ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]'
              : 'bg-red-500'
          }`}
        />
        <span
          className={`text-sm font-medium ${
            brokerConnected ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {brokerConnected
            ? `Connected${isPaperTrading ? ' (Paper)' : ' (Live)'}`
            : 'Disconnected'}
        </span>
      </div>

      {!brokerConnected && (
        <>
          {/* API Key */}
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-500 font-medium">
              API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AKXXXXXXXXXXXXXXXXXX"
              className="w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200
                         placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          {/* API Secret */}
          <div className="space-y-1.5">
            <label className="block text-xs text-gray-500 font-medium">
              API Secret
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Enter your API secret"
              className="w-full rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-sm text-gray-200
                         placeholder:text-gray-600 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          {/* Paper Trading toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-300 font-medium">
                Paper Trading
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Use simulated money for testing
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={paperTrading}
              onClick={() => setPaperTrading(!paperTrading)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition
                         ${paperTrading ? 'bg-brand-500' : 'bg-surface-700'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition transform
                           ${paperTrading ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </>
      )}

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Connect / Disconnect button */}
      <button
        onClick={brokerConnected ? handleDisconnect : handleConnect}
        disabled={loading || (!brokerConnected && (!apiKey || !apiSecret))}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
                    disabled:opacity-40 disabled:cursor-not-allowed ${
                      brokerConnected
                        ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                        : 'bg-brand-600 text-white hover:bg-brand-500'
                    }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : brokerConnected ? (
          <Unplug className="h-4 w-4" />
        ) : (
          <Plug className="h-4 w-4" />
        )}
        {brokerConnected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
