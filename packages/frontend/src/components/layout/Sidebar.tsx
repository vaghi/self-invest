import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Briefcase,
  History,
  Bot,
  BarChart3,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settings.store';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/positions', label: 'Positions', icon: Briefcase },
  { to: '/trades', label: 'Trade History', icon: History },
  { to: '/agent', label: 'Agent', icon: Bot },
  { to: '/market', label: 'Market', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const brokerConnected = useSettingsStore((s) => s.brokerConnected);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-surface-950 border-r border-surface-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <TrendingUp className="h-7 w-7 text-brand-400" />
        <span className="text-lg font-semibold tracking-tight text-white">
          Self-Invest
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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
      </div>
    </aside>
  );
}
