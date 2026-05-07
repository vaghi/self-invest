import { Play, Pause, Square, Zap, Loader2, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useAgentStore } from '../../stores/agent.store';

export default function AgentControls() {
  const { state, schedulerRunning, lastError, loading, start, stop, pause, resume, analyzeNow } =
    useAgentStore();
  const [showErrorModal, setShowErrorModal] = useState(false);

  const isActive = state === 'analyzing' || state === 'trading';
  const isError = state === 'error';
  const isScheduled = (schedulerRunning || isActive) && !isError;
  const isPaused = state === 'paused';
  const isDead = state === 'dead';

  return (
    <>
      <div className="rounded-xl bg-surface-800 border border-surface-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Agent Controls
        </h3>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Start / Resume */}
          <button
            onClick={isPaused || isError ? resume : start}
            disabled={(isScheduled && !isError) || isDead || loading}
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
            {isPaused || isError ? 'Resume' : 'Start'}
          </button>

          {/* Pause */}
          <button
            onClick={pause}
            disabled={!isScheduled || isPaused || isDead || loading}
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
            disabled={(!isScheduled && !isPaused && !isError) || isDead || loading}
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
            disabled={isDead || loading}
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
          <button
            onClick={() => { if (isError && lastError) setShowErrorModal(true); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isError
                ? 'bg-red-500/20 text-red-400 cursor-pointer hover:bg-red-500/30 underline decoration-dotted'
                : isActive
                  ? 'bg-green-500/20 text-green-400'
                  : isScheduled
                    ? 'bg-green-500/20 text-green-400'
                    : isPaused
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : isDead
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isError
                  ? 'bg-red-400'
                  : isActive || isScheduled
                    ? 'bg-green-400 animate-pulse'
                    : isPaused
                      ? 'bg-yellow-400'
                      : isDead
                        ? 'bg-red-400'
                        : 'bg-gray-400'
              }`}
            />
            {isError
              ? 'Error — click for details'
              : isScheduled && !isActive
                ? 'Running (waiting for next cycle)'
                : state.charAt(0).toUpperCase() + state.slice(1)}
          </button>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <h3 className="text-lg font-semibold text-red-100">Agent Error</h3>
              </div>
              <button onClick={() => setShowErrorModal(false)} className="text-gray-400 hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-red-950/50 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-red-200 font-mono break-all whitespace-pre-wrap">
                {lastError}
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setShowErrorModal(false); resume(); }}
                className="px-4 py-2 rounded-lg bg-green-600/20 text-green-400 border border-green-500/30 text-sm font-medium hover:bg-green-600/30"
              >
                Retry / Resume
              </button>
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm font-medium hover:bg-gray-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
