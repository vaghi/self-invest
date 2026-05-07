import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import Sidebar from './Sidebar';
import Header from './Header';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/positions': 'Positions',
  '/trades': 'Trade History',
  '/agent': 'Agent',
  '/market': 'Market',
  '/settings': 'Settings',
};

export default function Layout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? 'Self-Invest';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-950 text-gray-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col lg:pl-64">
        <Header title={title} onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
