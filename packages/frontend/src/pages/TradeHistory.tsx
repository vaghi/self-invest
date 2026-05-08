import { useEffect, useState } from 'react';
import { MoneyDisplay } from '../components/common/MoneyDisplay';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';

interface TradeRecord {
  id: string;
  symbol: string;
  side: string;
  quantity: string;
  price: string;
  totalCost: string;
  status: string;
  orderType: string;
  isPaper: boolean;
  createdAt: string;
  aiAnalysis?: { reasoning: string; confidence: number } | null;
}

export default function TradeHistory() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterSymbol, setFilterSymbol] = useState('');

  useEffect(() => {
    fetchTrades();
  }, [page, filterSymbol]);

  async function fetchTrades() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filterSymbol) params.set('symbol', filterSymbol);
    const { data } = await api.get(`/trades?${params}`);
    setTrades(data.trades);
    setTotalPages(data.pagination.totalPages);
    setLoading(false);
  }

  return (
    <div id="trade-history-page" className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Filter by symbol..."
          value={filterSymbol}
          onChange={(e) => { setFilterSymbol(e.target.value.toUpperCase()); setPage(1); }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500"
        />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="text-gray-400 text-center py-12" role="status">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="text-gray-400 text-center py-12">No trades found</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-sm">
                <th className="text-left p-4">Time</th>
                <th className="text-left p-4">Symbol</th>
                <th className="text-left p-4">Side</th>
                <th className="text-left p-4">Type</th>
                <th className="text-right p-4">Qty</th>
                <th className="text-right p-4">Price</th>
                <th className="text-right p-4">Total</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">AI Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-4 text-sm text-gray-400">
                    {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
                  </td>
                  <td className="p-4 font-semibold text-gray-100">{trade.symbol}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400">{trade.orderType}</td>
                  <td className="p-4 text-right text-gray-300">{trade.quantity}</td>
                  <td className="p-4 text-right text-gray-300">${parseFloat(trade.price).toFixed(2)}</td>
                  <td className="p-4 text-right"><MoneyDisplay value={trade.totalCost} /></td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      trade.status === 'FILLED' ? 'bg-green-500/20 text-green-400' :
                      trade.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-400 max-w-xs truncate">
                    {trade.aiAnalysis?.reasoning || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
