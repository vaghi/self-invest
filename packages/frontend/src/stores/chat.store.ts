import { create } from 'zustand';
import type { ChatMessage, UserInstruction } from '@self-invest/shared';
import api from '../services/api';
import { showError } from './toast.store';

interface ChatStoreState {
  messages: ChatMessage[];
  instructions: UserInstruction[];
  isOpen: boolean;
  isSending: boolean;
  hasMore: boolean;
  activeTab: 'chat' | 'instructions';

  toggle: () => void;
  open: () => void;
  close: () => void;
  setTab: (tab: 'chat' | 'instructions') => void;
  fetchMessages: () => Promise<void>;
  fetchInstructions: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  toggleInstruction: (id: string, active: boolean) => Promise<void>;
  deleteInstruction: (id: string) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: [],
  instructions: [],
  isOpen: false,
  isSending: false,
  hasMore: false,
  activeTab: 'chat',

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setTab: (tab) => set({ activeTab: tab }),

  fetchMessages: async () => {
    try {
      const { data } = await api.get('/chat/messages?limit=50');
      set({ messages: data.messages, hasMore: data.hasMore });
    } catch {}
  },

  fetchInstructions: async () => {
    try {
      const { data } = await api.get('/chat/instructions');
      set({ instructions: data });
    } catch {}
  },

  sendMessage: async (content) => {
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, tempUserMsg], isSending: true }));

    try {
      const { data } = await api.post('/chat/send', { message: content });
      set((s) => ({
        messages: [
          ...s.messages.filter((m) => m.id !== tempUserMsg.id),
          data.userMessage,
          data.agentResponse,
        ],
        isSending: false,
        instructions: data.instruction
          ? [data.instruction, ...s.instructions]
          : s.instructions,
      }));
    } catch (err: any) {
      set((s) => ({
        messages: s.messages.filter((m) => m.id !== tempUserMsg.id),
        isSending: false,
      }));
      showError('Chat Error', err.response?.data?.error || err.message);
    }
  },

  toggleInstruction: async (id, active) => {
    try {
      await api.put(`/chat/instructions/${id}/toggle`, { active });
      set((s) => ({
        instructions: s.instructions.map((i) =>
          i.id === id ? { ...i, status: active ? 'active' as const : 'disabled' as const } : i
        ),
      }));
    } catch (err: any) {
      showError('Error', err.response?.data?.error || err.message);
    }
  },

  deleteInstruction: async (id) => {
    try {
      await api.delete(`/chat/instructions/${id}`);
      set((s) => ({ instructions: s.instructions.filter((i) => i.id !== id) }));
    } catch (err: any) {
      showError('Error', err.response?.data?.error || err.message);
    }
  },

  addMessage: (msg) => {
    set((s) => {
      if (s.messages.some((m) => m.id === msg.id)) return s;
      return { messages: [...s.messages, msg] };
    });
  },
}));
