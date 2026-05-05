import { create } from 'zustand';
import type { AIProviderType } from '@self-invest/shared';
import api from '../services/api';

interface SettingsState {
  aiProvider: { type: AIProviderType; model: string; isLocal: boolean } | null;
  brokerConnected: boolean;
  isPaperTrading: boolean;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  setAIProvider: (type: AIProviderType, model: string) => Promise<void>;
  connectBroker: (apiKey: string, apiSecret: string, paper: boolean) => Promise<boolean>;
  disconnectBroker: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  aiProvider: null,
  brokerConnected: false,
  isPaperTrading: true,
  loading: false,
  error: null,

  fetchSettings: async () => {
    try {
      const [aiRes, brokerRes] = await Promise.all([
        api.get('/settings/ai-provider'),
        api.get('/auth/broker/status'),
      ]);
      set({
        aiProvider: aiRes.data.active,
        brokerConnected: brokerRes.data.connected,
        isPaperTrading: brokerRes.data.isPaperTrading ?? true,
      });
    } catch {}
  },

  setAIProvider: async (type, model) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/settings/ai-provider', { type, model });
      set({ aiProvider: data.active, loading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      throw err;
    }
  },

  connectBroker: async (apiKey, apiSecret, paper) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/broker/connect', {
        apiKey,
        apiSecret,
        isPaperTrading: paper,
        brokerType: 'alpaca',
      });
      set({ brokerConnected: true, isPaperTrading: paper, loading: false });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.error || err.message, loading: false });
      return false;
    }
  },

  disconnectBroker: async () => {
    await api.post('/auth/broker/disconnect');
    set({ brokerConnected: false });
  },
}));
