import { create } from 'zustand';
import type { AgentState, AIAnalysis } from '@self-invest/shared';
import api from '../services/api';
import { showError, showSuccess } from './toast.store';

interface AgentStoreState {
  state: AgentState;
  schedulerRunning: boolean;
  lastError: string | null;
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
  setState: (state: AgentState, reason?: string) => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  state: 'idle',
  schedulerRunning: false,
  lastError: null,
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
        schedulerRunning: data.scheduler?.running ?? false,
        lastError: data.lastError || null,
        uptime: data.uptime,
        totalTrades: data.totalTradesExecuted,
        successRate: data.successRate,
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      set({ error: msg });
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
      set({ state: data.state, schedulerRunning: true, loading: false, error: null });
      showSuccess('Agent Started', 'The trading agent is now running.');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      set({ error: msg, loading: false });
      showError('Cannot Start Agent', msg);
    }
  },

  stop: async () => {
    try {
      const { data } = await api.post('/agent/stop');
      set({ state: data.state, schedulerRunning: false });
      showSuccess('Agent Stopped', 'The trading agent has been stopped.');
    } catch (err: any) {
      showError('Error', err.response?.data?.error || err.message);
    }
  },

  pause: async () => {
    try {
      const { data } = await api.post('/agent/pause');
      set({ state: data.state });
      showSuccess('Agent Paused', 'The agent is paused and will not trade.');
    } catch (err: any) {
      showError('Error', err.response?.data?.error || err.message);
    }
  },

  resume: async () => {
    try {
      const { data } = await api.post('/agent/resume');
      set({ state: data.state });
      showSuccess('Agent Resumed', 'The trading agent is running again.');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      set({ error: msg });
      showError('Cannot Resume Agent', msg);
    }
  },

  analyzeNow: async () => {
    set({ loading: true });
    try {
      await api.post('/agent/analyze-now');
      set({ loading: false, error: null });
      showSuccess('Analysis Complete', 'Market analysis cycle finished.');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      set({ error: msg, loading: false });
      showError('Analysis Failed', msg);
    }
  },

  setState: (state, reason?: string) => set({ state, lastError: state === 'error' ? (reason || null) : null }),
}));
