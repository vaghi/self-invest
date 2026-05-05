import { create } from 'zustand';
import type { Balance, Position, PortfolioSnapshot } from '@self-invest/shared';
import api from '../services/api';

interface PortfolioState {
  balance: Balance | null;
  positions: Position[];
  snapshots: PortfolioSnapshot[];
  loading: boolean;
  error: string | null;
  fetchBalance: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchSnapshots: (days?: number) => Promise<void>;
  updateBalance: (balance: Balance) => void;
  updatePosition: (position: Position) => void;
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  balance: null,
  positions: [],
  snapshots: [],
  loading: false,
  error: null,

  fetchBalance: async () => {
    try {
      set({ loading: true, error: null });
      const { data } = await api.get('/portfolio/balance');
      set({ balance: data, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
    }
  },

  fetchPositions: async () => {
    try {
      const { data } = await api.get('/portfolio/positions');
      set({ positions: data });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message });
    }
  },

  fetchSnapshots: async (days = 30) => {
    try {
      const { data } = await api.get(`/portfolio/snapshots?days=${days}`);
      set({ snapshots: data });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message });
    }
  },

  updateBalance: (balance) => set({ balance }),
  updatePosition: (position) => {
    const positions = get().positions.map((p) =>
      p.symbol === position.symbol ? position : p
    );
    set({ positions });
  },
}));
