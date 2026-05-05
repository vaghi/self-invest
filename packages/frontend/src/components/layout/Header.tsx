import type { AgentState } from '@self-invest/shared';
import { useAgentStore } from '../../stores/agent.store';
import { useSettingsStore } from '../../stores/settings.store';

interface HeaderProps {
  title: string;
}

const stateLabels: Record<AgentState, string> = {
  idle: 'Idle',
  analyzing: 'Analyzing',
  trading: 'Trading',
  paused: 'Paused',
  error: 'Error',
  dead: 'Dead',
};

function agentDotColor(state: AgentState): string {
  switch (state) {
    case 'analyzing':
    case 'trading':
      return 'bg-green-500';
    case 'idle':
    case 'paused':
      return 'bg-yellow-500';
    case 'error':
    case 'dead':
      return 'bg-red-500';
  }
}

export default function Header({ title }: HeaderProps) {
  const agentState = useAgentStore((s) => s.state);
  const isPaperTrading = useSettingsStore((s) => s.isPaperTrading);

  return (
    <header className="sticky top-0 z-20">
      {isPaperTrading && (
        <div className="bg-yellow-500/90 px-4 py-1 text-center text-xs font-medium text-yellow-950">
          Paper Trading Mode -- No real money is being used
        </div>
      )}

      <div className="flex items-center justify-between border-b border-surface-800 bg-surface-900/80 px-6 py-4 backdrop-blur-sm">
        <h1 className="text-lg font-semibold text-white">{title}</h1>

        {/* Agent status badge */}
        <div className="flex items-center gap-2 rounded-full border border-surface-700 bg-surface-800 px-3 py-1.5 text-xs font-medium text-gray-300">
          <span
            className={`h-2 w-2 rounded-full ${agentDotColor(agentState)} ${
              agentState === 'analyzing' || agentState === 'trading'
                ? 'animate-pulse'
                : ''
            }`}
          />
          Agent: {stateLabels[agentState]}
        </div>
      </div>
    </header>
  );
}
