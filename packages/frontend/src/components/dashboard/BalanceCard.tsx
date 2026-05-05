import { TrendingUp, TrendingDown, Wallet, BarChart3, DollarSign } from 'lucide-react';
import type { Balance } from '@self-invest/shared';
import { MoneyDisplay } from '../common/MoneyDisplay';

interface BalanceCardProps {
  balance: Balance | null;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  if (!balance) {
    return (
      <div className="rounded-xl bg-surface-800 border border-surface-700 p-6 animate-pulse">
        <div className="h-4 w-28 rounded bg-surface-700 mb-4" />
        <div className="h-9 w-48 rounded bg-surface-700 mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 w-16 rounded bg-surface-700 mb-2" />
              <div className="h-5 w-24 rounded bg-surface-700" />
            </div>
          ))}
        </div>
        <div className="h-5 w-40 rounded bg-surface-700" />
      </div>
    );
  }

  const dayPnL = parseFloat(balance.dayPnL);
  const dayPnLPercent = parseFloat(balance.dayPnLPercent);
  const isPositive = dayPnL >= 0;

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-6">
      <p className="text-sm font-medium text-gray-400 mb-1">Portfolio Value</p>

      <MoneyDisplay
        value={balance.totalValue}
        className="text-3xl font-bold text-gray-100 tracking-tight"
      />

      <div className="grid grid-cols-3 gap-4 mt-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Cash
          </span>
          <MoneyDisplay
            value={balance.cashBalance}
            className="text-sm font-medium text-gray-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Invested
          </span>
          <MoneyDisplay
            value={balance.investedValue}
            className="text-sm font-medium text-gray-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            Buying Power
          </span>
          <MoneyDisplay
            value={balance.buyingPower}
            className="text-sm font-medium text-gray-300"
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-surface-700">
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-profit" />
          ) : (
            <TrendingDown className="h-4 w-4 text-loss" />
          )}
          <span className={`text-sm font-semibold ${isPositive ? 'text-profit' : 'text-loss'}`}>
            <MoneyDisplay value={balance.dayPnL} showSign />
          </span>
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              isPositive ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
            }`}
          >
            {isPositive ? '+' : ''}
            {dayPnLPercent.toFixed(2)}%
          </span>
          <span className="text-xs text-gray-400">today</span>
        </div>
      </div>
    </div>
  );
}
