import { create } from 'zustand';
import type { AgentState, AIAnalysis } from '@self-invest/shared';
import api from '../services/api';

interface AgentStoreState {
  state: AgentState;
  uptime: number;
  totalTrades: number;
  successRate: number;
  analyses: AIAnalysis[];
  loading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
  fetchAnalyses: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  analyzeNow: () => Promise<void>;
  setState: (state: AgentState) => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  state: 'idle',
  uptime: 0,
  totalTrades: 0,
  successRate: 0,
  analyses: [],
  loading: false,
  error: null,

  fetchStatus: async () => {
    try {
      const { data } = await api.get('/agent/status');
      set({
        state: data.state,
        uptime: data.uptime,
        totalTrades: data.totalTradesExecuted,
        successRate: data.successRate,
      });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message });
    }
  },

  fetchAnalyses: async () => {
    try {
      const { data } = await api.get('/agent/analyses?limit=20');
      set({ analyses: data });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message });
    }
  },

  start: async () => {
    set({ loading: true });
    try {
      const { data } = await api.post('/agent/start');
      set({ state: data.state, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
    }
  },

  stop: async () => {
    const { data } = await api.post('/agent/stop');
    set({ state: data.state });
  },

  pause: async () => {
    const { data } = await api.post('/agent/pause');
    set({ state: data.state });
  },

  resume: async () => {
    const { data } = await api.post('/agent/resume');
    set({ state: data.state });
  },

  analyzeNow: async () => {
    set({ loading: true });
    try {
      await api.post('/agent/analyze-now');
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
    }
  },

  setState: (state) => set({ state }),
}));
