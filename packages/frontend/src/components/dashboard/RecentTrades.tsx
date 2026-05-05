import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MoneyDisplay } from '../common/MoneyDisplay';

interface RecentTrade {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: string;
  price: string;
  status: string;
  createdAt: string;
}

interface RecentTradesProps {
  trades: RecentTrade[];
}

function statusBadge(status: string) {
  const base = 'text-xs font-medium px-1.5 py-0.5 rounded';
  switch (status) {
    case 'filled':
      return `${base} bg-emerald-500/10 text-emerald-400`;
    case 'partially_filled':
      return `${base} bg-amber-500/10 text-amber-400`;
    case 'cancelled':
    case 'rejected':
    case 'expired':
      return `${base} bg-red-500/10 text-red-400`;
    default:
      return `${base} bg-surface-700 text-gray-400`;
  }
}

export function RecentTrades({ trades }: RecentTradesProps) {
  const displayed = trades.slice(0, 5);

  if (displayed.length === 0) {
    return (
      <div className="rounded-xl bg-surface-800 border border-surface-700 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Trades</h3>
        <p className="text-sm text-gray-400 text-center py-8">No trades yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Trades</h3>

      <div className="space-y-3">
        {displayed.map((trade, idx) => {
          const isBuy = trade.side === 'buy';
          return (
            <div
              key={`${trade.symbol}-${trade.createdAt}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-surface-850 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {isBuy ? (
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-profit" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 shrink-0 text-loss" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-100">
                      {trade.symbol}
                    </span>
                    <span
                      className={`text-xs font-bold uppercase ${
                        isBuy ? 'text-profit' : 'text-loss'
                      }`}
                    >
                      {trade.side}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {trade.quantity} @
                    </span>
                    <MoneyDisplay
                      value={trade.price}
                      className="text-xs text-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={statusBadge(trade.status)}>
                  {trade.status.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
