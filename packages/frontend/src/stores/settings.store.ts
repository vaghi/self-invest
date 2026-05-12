import { create } from 'zustand';
import type { AIProviderType } from '@self-invest/shared';
import api from '../services/api';
import { showError, showSuccess } from './toast.store';

interface SettingsState {
  aiProvider: { type: AIProviderType; model: string; isLocal: boolean; healthy: boolean } | null;
  brokerConnected: boolean;
  isPaperTrading: boolean;
  loading: boolean;
  initialLoading: boolean;
  aiError: string | null;
  brokerError: string | null;
  fetchSettings: () => Promise<void>;
  setAIProvider: (type: AIProviderType, model: string, apiKey?: string) => Promise<void>;
  connectBroker: (apiKey: string, apiSecret: string, paper: boolean) => Promise<boolean>;
  disconnectBroker: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  aiProvider: null,
  brokerConnected: false,
  isPaperTrading: true,
  loading: false,
  initialLoading: true,
  aiError: null,
  brokerError: null,

  fetchSettings: async () => {
    set({ initialLoading: true });
    try {
      const [aiRes, brokerRes] = await Promise.all([
        api.get('/settings/ai-provider'),
        api.get('/auth/broker/status'),
      ]);
      set({
        aiProvider: aiRes.data.active,
        brokerConnected: brokerRes.data.connected,
        isPaperTrading: brokerRes.data.isPaperTrading ?? true,
        initialLoading: false,
      });
    } catch {
      set({ initialLoading: false });
    }
  },

  setAIProvider: async (type, model, apiKey?) => {
    set({ loading: true, aiError: null });
    try {
      const body: Record<string, string> = { type, model };
      if (apiKey) body.apiKey = apiKey;
      const { data } = await api.post('/settings/ai-provider', body);
      set({ aiProvider: data.active, loading: false });
      showSuccess('AI Provider Connected', `${type} (${model}) is now active.`);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      set({ aiError: msg, loading: false });
      showError('AI Provider Error', msg);
      throw err;
    }
  },

  connectBroker: async (apiKey, apiSecret, paper) => {
    set({ loading: true, brokerError: null });
    try {
      await api.post('/auth/broker/connect', {
        apiKey,
        apiSecret,
        isPaperTrading: paper,
        brokerType: 'alpaca',
      });
      set({ brokerConnected: true, isPaperTrading: paper, loading: false });
      showSuccess('Broker Connected', `Alpaca ${paper ? 'paper trading' : 'live'} account connected.`);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      set({ brokerError: msg, loading: false });
      showError('Broker Connection Failed', msg);
      return false;
    }
  },

  disconnectBroker: async () => {
    await api.post('/auth/broker/disconnect');
    set({ brokerConnected: false });
    showSuccess('Broker Disconnected', 'Alpaca account disconnected.');
  },
}));
