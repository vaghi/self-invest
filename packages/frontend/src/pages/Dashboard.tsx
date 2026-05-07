import { useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolio.store';
import { useAgentStore } from '../stores/agent.store';
import { BalanceCard } from '../components/dashboard/BalanceCard';
import { AgentStatusBadge } from '../components/dashboard/AgentStatusBadge';
import { PnLChart } from '../components/dashboard/PnLChart';
import { PortfolioDonut } from '../components/dashboard/PortfolioDonut';
import { RecentTrades } from '../components/dashboard/RecentTrades';
import api from '../services/api';
import { useState } from 'react';

export default function Dashboard() {
  const { balance, positions, snapshots, fetchBalance, fetchPositions, fetchSnapshots } = usePortfolioStore();
  const { state, uptime, totalTrades, schedulerRunning, fetchStatus } = useAgentStore();
  const [recentTrades, setRecentTrades] = useState<any[]>([]);

  useEffect(() => {
    fetchBalance();
    fetchPositions();
    fetchSnapshots(30);
    fetchStatus();
    api.get('/trades/stats').then(({ data }) => setRecentTrades(data.recentTrades || []));

    const interval = setInterval(() => {
      fetchBalance();
      fetchPositions();
      fetchStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BalanceCard balance={balance} />
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Agent Status</h3>
          <AgentStatusBadge state={state} uptime={uptime} schedulerRunning={schedulerRunning} />
          <div className="mt-4 text-sm text-gray-400">
            Total trades executed: <span className="text-gray-200">{totalTrades}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Equity Curve</h3>
          <PnLChart data={snapshots} />
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Allocation</h3>
          <PortfolioDonut
            positions={positions.map((p) => ({ symbol: p.symbol, marketValue: p.marketValue }))}
            cashBalance={balance?.cashBalance || '0'}
          />
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Trades</h3>
        <RecentTrades trades={recentTrades} />
      </div>
    </div>
  );
}
