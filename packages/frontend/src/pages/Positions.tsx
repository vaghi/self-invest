import { useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolio.store';
import { MoneyDisplay } from '../components/common/MoneyDisplay';

export default function Positions() {
  const { positions, fetchPositions, loading } = usePortfolioStore();

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && positions.length === 0) {
    return <div className="text-gray-400 text-center py-12">Loading positions...</div>;
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">No open positions</p>
        <p className="text-gray-500 text-sm mt-2">The agent will open positions when it finds opportunities</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800 text-gray-400 text-sm">
            <th className="text-left p-4">Symbol</th>
            <th className="text-left p-4">Side</th>
            <th className="text-right p-4">Qty</th>
            <th className="text-right p-4">Avg Entry</th>
            <th className="text-right p-4">Current</th>
            <th className="text-right p-4">Market Value</th>
            <th className="text-right p-4">P&L</th>
            <th className="text-right p-4">P&L %</th>
            <th className="text-right p-4">Stop Loss</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => (
            <tr key={pos.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <td className="p-4 font-semibold text-gray-100">{pos.symbol}</td>
              <td className="p-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  pos.side === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {pos.side.toUpperCase()}
                </span>
              </td>
              <td className="p-4 text-right text-gray-300">{pos.quantity}</td>
              <td className="p-4 text-right text-gray-300">${parseFloat(pos.avgEntryPrice).toFixed(2)}</td>
              <td className="p-4 text-right text-gray-100 font-medium">${parseFloat(pos.currentPrice).toFixed(2)}</td>
              <td className="p-4 text-right text-gray-300"><MoneyDisplay value={pos.marketValue} /></td>
              <td className="p-4 text-right"><MoneyDisplay value={pos.unrealizedPnL} showSign /></td>
              <td className="p-4 text-right">
                <span className={parseFloat(pos.unrealizedPnLPercent) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {(parseFloat(pos.unrealizedPnLPercent) * 100).toFixed(2)}%
                </span>
              </td>
              <td className="p-4 text-right text-gray-400">
                {pos.stopLossPrice ? `$${parseFloat(pos.stopLossPrice).toFixed(2)}` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
