import type { AgentState } from '@self-invest/shared';

interface AgentStatusBadgeProps {
  state: AgentState;
  uptime: number;
  schedulerRunning?: boolean;
}

function getDotClasses(state: AgentState, scheduled: boolean): string {
  if (state === 'error' || state === 'dead') return 'bg-red-500';
  if (state === 'analyzing' || state === 'trading') return 'bg-emerald-400 animate-pulse';
  if (scheduled) return 'bg-emerald-400 animate-pulse';
  if (state === 'paused') return 'bg-amber-400';
  return 'bg-gray-500';
}

function getBadgeBg(state: AgentState, scheduled: boolean): string {
  if (state === 'error' || state === 'dead') return 'bg-red-500/10 border-red-500/20';
  if (state === 'analyzing' || state === 'trading' || scheduled) return 'bg-emerald-500/10 border-emerald-500/20';
  if (state === 'paused') return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-surface-700 border-surface-700';
}

function getLabel(state: AgentState, scheduled: boolean): string {
  if (state === 'error') return 'Error';
  if (state === 'dead') return 'Dead';
  if (state === 'analyzing') return 'Analyzing';
  if (state === 'trading') return 'Trading';
  if (scheduled) return 'Running';
  if (state === 'paused') return 'Paused';
  return 'Idle';
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

export function AgentStatusBadge({ state, uptime, schedulerRunning = false }: AgentStatusBadgeProps) {
  const scheduled = schedulerRunning && state !== 'error' && state !== 'dead';

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`Agent status: ${getLabel(state, scheduled)}`}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium text-gray-100 ${getBadgeBg(state, scheduled)}`}
    >
      <span className={`h-2 w-2 rounded-full ${getDotClasses(state, scheduled)}`} />
      <span>{getLabel(state, scheduled)}</span>
      {(scheduled || state === 'analyzing' || state === 'trading') && uptime > 0 && (
        <span className="text-xs text-gray-400 ml-1">{formatUptime(uptime)}</span>
      )}
    </span>
  );
}
