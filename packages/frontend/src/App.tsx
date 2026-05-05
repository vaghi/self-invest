import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import { wsClient } from './services/websocket';
import { usePortfolioStore } from './stores/portfolio.store';
import { useAgentStore } from './stores/agent.store';
import Dashboard from './pages/Dashboard';
import Positions from './pages/Positions';
import TradeHistory from './pages/TradeHistory';
import AgentView from './pages/AgentView';
import MarketView from './pages/MarketView';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, refetchOnWindowFocus: false },
  },
});

function WebSocketManager() {
  const updateBalance = usePortfolioStore((s) => s.updateBalance);
  const updatePosition = usePortfolioStore((s) => s.updatePosition);
  const setAgentState = useAgentStore((s) => s.setState);

  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:${window.location.port}/ws`;
    wsClient.connect(wsUrl);

    const unsubscribe = wsClient.subscribe((event) => {
      switch (event.type) {
        case 'portfolio_update':
          updateBalance(event.data as any);
          break;
        case 'position_update':
          updatePosition(event.data as any);
          break;
        case 'agent_state_change':
          setAgentState((event.data as any).to);
          break;
        case 'agent_death':
          setAgentState('dead');
          break;
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WebSocketManager />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="positions" element={<Positions />} />
              <Route path="trades" element={<TradeHistory />} />
              <Route path="agent" element={<AgentView />} />
              <Route path="market" element={<MarketView />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
