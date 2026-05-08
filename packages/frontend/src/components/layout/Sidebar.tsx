import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Briefcase,
  History,
  Bot,
  BarChart3,
  Settings,
  TrendingUp,
  RefreshCw,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useSettingsStore } from '../../stores/settings.store';
import { usePortfolioStore } from '../../stores/portfolio.store';
import { useAgentStore } from '../../stores/agent.store';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/positions', label: 'Positions', icon: Briefcase },
  { to: '/trades', label: 'Trade History', icon: History },
  { to: '/agent', label: 'Agent', icon: Bot },
  { to: '/market', label: 'Market', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const brokerConnected = useSettingsStore((s) => s.brokerConnected);
  const fetchBalance = usePortfolioStore((s) => s.fetchBalance);
  const fetchPositions = usePortfolioStore((s) => s.fetchPositions);
  const fetchStatus = useAgentStore((s) => s.fetchStatus);
  const [spinning, setSpinning] = useState(false);

  async function handleRefresh() {
    setSpinning(true);
    await Promise.all([fetchBalance(), fetchPositions(), fetchStatus()]);
    setTimeout(() => setSpinning(false), 600);
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside id="sidebar" aria-label="Main sidebar" className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface-950 border-r border-surface-800 transition-transform duration-200 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-7 w-7 text-brand-400" />
            <span className="text-lg font-semibold tracking-tight text-white">
              Self-Invest
            </span>
          </div>
          <button onClick={onClose} aria-label="Close sidebar" className="lg:hidden text-gray-400 hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav id="sidebar-nav" role="navigation" aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Connection status */}
        <div className="border-t border-surface-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  brokerConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-gray-400">
                {brokerConnected ? 'Broker connected' : 'Broker disconnected'}
              </span>
            </div>
            {brokerConnected && (
              <button
                onClick={handleRefresh}
                aria-label="Refresh data"
                className="text-gray-500 hover:text-brand-400 transition"
                title="Refresh data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
