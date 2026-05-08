import { MessageCircle } from 'lucide-react';
import { useChatStore } from '../../stores/chat.store';

export function ChatButton() {
  const { toggle, isOpen } = useChatStore();

  return (
    <button
      id="chat-button"
      onClick={toggle}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      aria-expanded={isOpen}
      className={`fixed bottom-6 right-6 z-[9998] h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 ${
        isOpen
          ? 'bg-gray-700 hover:bg-gray-600 rotate-90'
          : 'bg-brand-600 hover:bg-brand-500 hover:scale-110'
      }`}
    >
      <MessageCircle className="h-6 w-6 text-white" />
    </button>
  );
}
