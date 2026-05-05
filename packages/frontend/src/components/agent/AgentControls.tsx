import { Play, Pause, Square, Zap, Loader2 } from 'lucide-react';
import { useAgentStore } from '../../stores/agent.store';

export default function AgentControls() {
  const { state, loading, start, stop, pause, resume, analyzeNow } =
    useAgentStore();

  const isRunning = state === 'analyzing' || state === 'trading';
  const isPaused = state === 'paused';
  const isDead = state === 'dead';

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Agent Controls
      </h3>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Start / Resume */}
        <button
          onClick={isPaused ? resume : start}
          disabled={isRunning || isDead || loading}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                     bg-green-600/20 text-green-400 border border-green-500/30
                     hover:bg-green-600/30 transition
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isPaused ? 'Resume' : 'Start'}
        </button>

        {/* Pause */}
        <button
          onClick={pause}
          disabled={!isRunning || loading}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                     bg-yellow-600/20 text-yellow-400 border border-yellow-500/30
                     hover:bg-yellow-600/30 transition
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Pause className="h-4 w-4" />
          Pause
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          disabled={state === 'idle' || isDead || loading}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                     bg-red-600/20 text-red-400 border border-red-500/30
                     hover:bg-red-600/30 transition
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Square className="h-4 w-4" />
          Stop
        </button>

        {/* Analyze Now */}
        <button
          onClick={analyzeNow}
          disabled={(!isRunning && !isPaused) || isDead || loading}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                     bg-brand-600/20 text-brand-400 border border-brand-500/30
                     hover:bg-brand-600/30 transition
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Analyze Now
        </button>
      </div>

      {/* Current state badge */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-gray-500">Status:</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isRunning
              ? 'bg-green-500/20 text-green-400'
              : isPaused
                ? 'bg-yellow-500/20 text-yellow-400'
                : isDead
                  ? 'bg-red-500/20 text-red-400'
                  : state === 'error'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-gray-500/20 text-gray-400'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isRunning
                ? 'bg-green-400 animate-pulse'
                : isPaused
                  ? 'bg-yellow-400'
                  : isDead
                    ? 'bg-red-400'
                    : state === 'error'
                      ? 'bg-red-400'
                      : 'bg-gray-400'
            }`}
          />
          {state.charAt(0).toUpperCase() + state.slice(1)}
        </span>
      </div>
    </div>
  );
}
