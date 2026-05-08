import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings.store';
import AIProviderSelector from '../components/settings/AIProviderSelector';
import BrokerConfig from '../components/settings/BrokerConfig';
import RiskParamsForm from '../components/settings/RiskParamsForm';
import IntervalConfig from '../components/settings/IntervalConfig';

export default function Settings() {
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div id="settings-page" className="space-y-8 max-w-4xl">
      <section className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-6">Broker Connection</h2>
        <BrokerConfig />
      </section>

      <section className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-6">AI Provider</h2>
        <AIProviderSelector />
      </section>

      <section className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-6">Analysis Interval</h2>
        <IntervalConfig />
      </section>

      <section className="bg-gray-900 rounded-xl border border-gray-800 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-6">Risk Management</h2>
        <RiskParamsForm />
      </section>
    </div>
  );
}
