import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastContainer } from './components/common/ToastContainer';
import { ChatButton } from './components/chat/ChatButton';
import { ChatPanel } from './components/chat/ChatPanel';
import { wsClient } from './services/websocket';
import { usePortfolioStore } from './stores/portfolio.store';
import { useAgentStore } from './stores/agent.store';
import { useChatStore } from './stores/chat.store';
import { showError } from './stores/toast.store';
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
  const fetchBalance = usePortfolioStore((s) => s.fetchBalance);
  const fetchPositions = usePortfolioStore((s) => s.fetchPositions);
  const setAgentState = useAgentStore((s) => s.setState);
  const addChatMessage = useChatStore((s) => s.addMessage);

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
        case 'agent_state_change': {
          const { to, reason } = event.data as any;
          setAgentState(to, reason);
          if (to === 'error') {
            showError('Agent Error', reason || 'The agent encountered an error. Click the status badge for details.');
          }
          break;
        }
        case 'agent_death':
          setAgentState('dead');
          showError('Agent Terminated', 'Balance depleted to zero. The agent has died.');
          break;
        case 'error':
          showError('Error', (event.data as any).message || 'An unexpected error occurred');
          break;
        case 'trade_executed':
          fetchBalance();
          fetchPositions();
          break;
        case 'chat_message':
          addChatMessage(event.data as any);
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
          <ToastContainer />
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
          <ChatButton />
          <ChatPanel />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
