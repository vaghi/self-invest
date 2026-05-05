import type { AgentState } from '@self-invest/shared';

interface AgentStatusBadgeProps {
  state: AgentState;
  uptime: number;
}

function getDotClasses(state: AgentState): string {
  switch (state) {
    case 'analyzing':
    case 'trading':
      return 'bg-emerald-400 animate-pulse';
    case 'idle':
    case 'paused':
      return 'bg-amber-400';
    case 'error':
    case 'dead':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

function getBadgeBg(state: AgentState): string {
  switch (state) {
    case 'analyzing':
    case 'trading':
      return 'bg-emerald-500/10 border-emerald-500/20';
    case 'idle':
    case 'paused':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'error':
    case 'dead':
      return 'bg-red-500/10 border-red-500/20';
    default:
      return 'bg-surface-700 border-surface-700';
  }
}

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
}

export function AgentStatusBadge({ state, uptime }: AgentStatusBadgeProps) {
  const isRunning = state !== 'dead' && state !== 'error';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium text-gray-100 ${getBadgeBg(state)}`}
    >
      <span className={`h-2 w-2 rounded-full ${getDotClasses(state)}`} />
      <span className="capitalize">{state}</span>
      {isRunning && uptime > 0 && (
        <span className="text-xs text-gray-400 ml-1">{formatUptime(uptime)}</span>
      )}
    </span>
  );
}
