import { useState, useEffect } from 'react';
import { Timer, Loader2, Check } from 'lucide-react';
import api from '../../services/api';
import { showSuccess, showError } from '../../stores/toast.store';

const PRESETS = [1, 2, 5, 10, 15, 30];

export default function IntervalConfig() {
  const [interval, setInterval_] = useState(2);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings/interval').then(({ data }) => {
      setInterval_(data.intervalMinutes);
    }).catch(() => {});
  }, []);

  async function handleSave(minutes: number) {
    setLoading(true);
    setSaved(false);
    try {
      await api.put('/settings/interval', { intervalMinutes: minutes });
      setInterval_(minutes);
      setSaved(true);
      showSuccess('Interval Updated', `Agent will analyze every ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      showError('Error', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Timer className="h-4 w-4" />
        Analysis runs every <span className="text-gray-100 font-semibold">{interval} min</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => handleSave(m)}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              interval === m
                ? 'bg-brand-600/30 border-brand-500 text-brand-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            } disabled:opacity-50`}
          >
            {m}m
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="number"
          min={1}
          max={60}
          value={interval}
          onChange={(e) => setInterval_(parseInt(e.target.value) || 1)}
          className="w-20 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={() => handleSave(interval)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? 'Saved' : 'Set Custom'}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Lower = more active trading, more AI API calls. During market hours (9:30 AM - 4:00 PM ET), 1-2 min is recommended for active trading.
      </p>
    </div>
  );
}
