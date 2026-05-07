import { useEffect, useRef } from 'react';
import { X, MessageCircle, ListChecks } from 'lucide-react';
import { useChatStore } from '../../stores/chat.store';
import { ChatMessageBubble } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { InstructionsList } from './InstructionsList';

export function ChatPanel() {
  const { isOpen, close, messages, activeTab, setTab, fetchMessages, fetchInstructions } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      fetchInstructions();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[9998] w-96 h-[600px] bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[slideIn_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/80">
        <h3 className="text-sm font-semibold text-gray-100">Agent Chat</h3>
        <button onClick={close} className="text-gray-500 hover:text-gray-300 transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition ${
            activeTab === 'chat' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat
        </button>
        <button
          onClick={() => setTab('instructions')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition ${
            activeTab === 'instructions' ? 'text-brand-400 border-b-2 border-brand-500' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <ListChecks className="h-3.5 w-3.5" />
          Instructions
        </button>
      </div>

      {/* Content */}
      {activeTab === 'chat' ? (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <MessageCircle className="h-8 w-8 text-gray-700 mx-auto" />
                  <p className="text-sm text-gray-500">Tell the agent what to do</p>
                  <div className="text-[11px] text-gray-600 space-y-1">
                    <p>"Never buy Tesla"</p>
                    <p>"Buy 10 shares of NVDA"</p>
                    <p>"Focus on high-growth tech stocks"</p>
                    <p>"Sell all my AAPL"</p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>
          <ChatInput />
        </>
      ) : (
        <InstructionsList />
      )}
    </div>
  );
}
