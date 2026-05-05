import { Skull, RefreshCw } from 'lucide-react';

interface DeathScreenProps {
  finalBalance: string;
  totalTrades: number;
  totalPnL: string;
  reason: string;
}

export default function DeathScreen({
  finalBalance,
  totalTrades,
  totalPnL,
  reason,
}: DeathScreenProps) {
  const pnlValue = parseFloat(totalPnL);
  const pnlColor = pnlValue >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-red-900/50 bg-surface-900 p-8 text-center shadow-2xl shadow-red-900/20">
        {/* Skull icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-900/30 border border-red-800/40">
          <Skull className="h-14 w-14 text-red-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-red-500 tracking-wide mb-2">
          AGENT TERMINATED
        </h1>
        <p className="text-sm text-gray-500 mb-8">{reason}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg bg-surface-800 border border-surface-700 p-4">
            <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Final Balance
            </span>
            <span className="text-lg font-semibold text-gray-200">
              ${parseFloat(finalBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="rounded-lg bg-surface-800 border border-surface-700 p-4">
            <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Total Trades
            </span>
            <span className="text-lg font-semibold text-gray-200">
              {totalTrades}
            </span>
          </div>

          <div className="col-span-2 rounded-lg bg-surface-800 border border-surface-700 p-4">
            <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Total P&L
            </span>
            <span className={`text-xl font-bold ${pnlColor}`}>
              {pnlValue >= 0 ? '+' : ''}${parseFloat(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Restart button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white
                     hover:bg-red-500 transition shadow-lg shadow-red-900/30"
        >
          <RefreshCw className="h-4 w-4" />
          Restart
        </button>
      </div>
    </div>
  );
}
