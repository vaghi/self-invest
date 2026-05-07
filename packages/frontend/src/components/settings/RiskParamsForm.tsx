import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import { DEFAULT_RISK_CONFIG } from '@self-invest/shared';
import type { RiskConfig } from '@self-invest/shared';
import api from '../../services/api';

interface FieldDef {
  key: keyof RiskConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const FIELDS: FieldDef[] = [
  { key: 'maxPositionSizePct', label: 'Max Position Size', min: 1, max: 100, step: 1, unit: '%' },
  { key: 'maxPortfolioDrawdownPct', label: 'Max Portfolio Drawdown', min: 1, max: 100, step: 1, unit: '%' },
  { key: 'maxDailyLossPct', label: 'Max Daily Loss', min: 1, max: 100, step: 1, unit: '%' },
  { key: 'maxOpenPositions', label: 'Max Open Positions', min: 1, max: 100, step: 1, unit: '' },
  { key: 'defaultStopLossPct', label: 'Default Stop Loss', min: 0.5, max: 50, step: 0.5, unit: '%' },
  { key: 'minCashReservePct', label: 'Min Cash Reserve', min: 0, max: 90, step: 1, unit: '%' },
];

export default function RiskParamsForm() {
  const [values, setValues] = useState<RiskConfig>({ ...DEFAULT_RISK_CONFIG });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/settings/risk').then(({ data }) => {
      setValues(data);
    }).catch(() => {});
  }, []);

  function handleChange(key: keyof RiskConfig, value: number) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await api.put('/settings/risk', values);
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
        Risk Parameters
      </h3>

      <div className="space-y-5">
        {FIELDS.map(({ key, label, min, max, step, unit }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-400 font-medium">
                {label}
              </label>
              <span className="text-sm font-mono text-gray-200">
                {values[key]}
                {unit}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={values[key]}
                onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                           bg-surface-700
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:h-4
                           [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-brand-500
                           [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(99,102,241,0.5)]
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-moz-range-thumb]:h-4
                           [&::-moz-range-thumb]:w-4
                           [&::-moz-range-thumb]:rounded-full
                           [&::-moz-range-thumb]:bg-brand-500
                           [&::-moz-range-thumb]:border-0
                           [&::-moz-range-thumb]:cursor-pointer"
              />
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={values[key]}
                onChange={(e) => handleChange(key, parseFloat(e.target.value) || min)}
                className="w-20 rounded-lg bg-surface-900 border border-surface-700 px-2 py-1 text-sm text-gray-200 text-center
                           focus:outline-none focus:border-brand-500 transition
                           [appearance:textfield]
                           [&::-webkit-outer-spin-button]:appearance-none
                           [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white
                   hover:bg-brand-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saved ? 'Saved' : 'Save Risk Settings'}
      </button>
    </div>
  );
}
