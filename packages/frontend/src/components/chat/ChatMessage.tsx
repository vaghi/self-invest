import type { ChatMessage as ChatMessageType } from '@self-invest/shared';
import { formatDistanceToNow } from 'date-fns';
import { Bot, User } from 'lucide-react';

interface Props {
  message: ChatMessageType;
}

const classificationBadges: Record<string, { label: string; color: string }> = {
  persistent_rule: { label: 'Rule Created', color: 'bg-purple-500/20 text-purple-400' },
  one_time_command: { label: 'Command', color: 'bg-blue-500/20 text-blue-400' },
  question: { label: 'Question', color: 'bg-gray-500/20 text-gray-400' },
};

export function ChatMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
        isUser ? 'bg-brand-600/30' : 'bg-green-600/30'
      }`}>
        {isUser ? <User className="h-3.5 w-3.5 text-brand-400" /> : <Bot className="h-3.5 w-3.5 text-green-400" />}
      </div>

      <div className={`max-w-[80%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-brand-600/20 text-gray-100 rounded-tr-sm'
            : 'bg-gray-800 text-gray-200 rounded-tl-sm'
        }`}>
          {message.content}
        </div>

        <div className={`flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {message.classification && classificationBadges[message.classification] && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${classificationBadges[message.classification].color}`}>
              {classificationBadges[message.classification].label}
            </span>
          )}
          <span className="text-[10px] text-gray-600">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
