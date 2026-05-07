import { useState } from 'react';
import { X, AlertCircle, Menu } from 'lucide-react';
import type { AgentState } from '@self-invest/shared';
import { useAgentStore } from '../../stores/agent.store';
import { useSettingsStore } from '../../stores/settings.store';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

function getDisplayState(state: AgentState, schedulerRunning: boolean): { label: string; color: string; pulse: boolean } {
  if (state === 'analyzing' || state === 'trading') {
    return { label: state.charAt(0).toUpperCase() + state.slice(1), color: 'bg-green-500', pulse: true };
  }
  if (schedulerRunning && state === 'idle') {
    return { label: 'Running', color: 'bg-green-500', pulse: true };
  }
  if (state === 'paused') {
    return { label: 'Paused', color: 'bg-yellow-500', pulse: false };
  }
  if (state === 'error') {
    return { label: 'Error', color: 'bg-red-500', pulse: false };
  }
  if (state === 'dead') {
    return { label: 'Dead', color: 'bg-red-500', pulse: false };
  }
  return { label: 'Idle', color: 'bg-gray-500', pulse: false };
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  const agentState = useAgentStore((s) => s.state);
  const schedulerRunning = useAgentStore((s) => s.schedulerRunning);
  const lastError = useAgentStore((s) => s.lastError);
  const isPaperTrading = useSettingsStore((s) => s.isPaperTrading);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const display = getDisplayState(agentState, schedulerRunning);
  const isClickable = agentState === 'error' && !!lastError;

  return (
    <>
      <header className="sticky top-0 z-20">
        {isPaperTrading && (
          <div className="bg-yellow-500/90 px-4 py-1 text-center text-xs font-medium text-yellow-950">
            Paper Trading Mode -- No real money is being used
          </div>
        )}

        <div className="flex items-center justify-between border-b border-surface-800 bg-surface-900/80 px-4 md:px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={onMenuToggle} className="lg:hidden text-gray-400 hover:text-gray-200">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-white">{title}</h1>
          </div>

          {/* Agent status badge */}
          <button
            onClick={() => { if (isClickable) setShowErrorModal(true); }}
            className={`flex items-center gap-2 rounded-full border border-surface-700 bg-surface-800 px-3 py-1.5 text-xs font-medium text-gray-300 ${
              isClickable ? 'cursor-pointer hover:border-red-500/50 hover:bg-red-950/30' : 'cursor-default'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${display.color} ${display.pulse ? 'animate-pulse' : ''}`}
            />
            Agent: {display.label}
            {isClickable && <AlertCircle className="h-3 w-3 text-red-400 ml-1" />}
          </button>
        </div>
      </header>

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
            <div className="mt-4">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm font-medium hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
