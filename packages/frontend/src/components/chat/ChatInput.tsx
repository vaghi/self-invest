import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useChatStore } from '../../stores/chat.store';

export function ChatInput() {
  const [text, setText] = useState('');
  const { sendMessage, isSending } = useChatStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = text.trim();
    if (!msg || isSending) return;
    setText('');
    await sendMessage(msg);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-gray-800">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tell the agent what to do..."
        disabled={isSending}
        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-brand-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!text.trim() || isSending}
        className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 text-white animate-spin" />
        ) : (
          <Send className="h-4 w-4 text-white" />
        )}
      </button>
    </form>
  );
}
