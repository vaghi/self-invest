import { useEffect } from 'react';
import { useAgentStore } from '../stores/agent.store';
import AgentControls from '../components/agent/AgentControls';
import ReasoningLog from '../components/agent/ReasoningLog';
import DeathScreen from '../components/agent/DeathScreen';
import { AgentStatusBadge } from '../components/dashboard/AgentStatusBadge';

export default function AgentView() {
  const { state, uptime, totalTrades, analyses, fetchStatus, fetchAnalyses } = useAgentStore();

  useEffect(() => {
    fetchStatus();
    fetchAnalyses();
    const interval = setInterval(() => {
      fetchStatus();
      fetchAnalyses();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (state === 'dead') {
    return (
      <DeathScreen
        finalBalance="0.00"
        totalTrades={totalTrades}
        totalPnL="0.00"
        reason="Balance depleted to zero"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Agent State</h3>
          <AgentStatusBadge state={state} uptime={uptime} />
        </div>
        <div className="lg:col-span-2 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Controls</h3>
          <AgentControls />
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-4">AI Reasoning Log</h3>
        <ReasoningLog analyses={analyses} />
      </div>
    </div>
  );
}
