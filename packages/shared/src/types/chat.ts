export type ChatMessageRole = 'user' | 'agent' | 'system';
export type MessageClassification = 'persistent_rule' | 'one_time_command' | 'research_command' | 'question' | 'acknowledgment';
export type InstructionStatus = 'active' | 'disabled';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  classification?: MessageClassification;
  metadata?: Record<string, unknown>;
  instructionId?: string;
  createdAt: string;
}

export interface UserInstruction {
  id: string;
  originalMessage: string;
  compactRule: string;
  category: string;
  status: InstructionStatus;
  createdAt: string;
  disabledAt?: string;
}

export interface ChatSendRequest {
  message: string;
}

export interface ChatSendResponse {
  userMessage: ChatMessage;
  agentResponse: ChatMessage;
  instruction?: UserInstruction;
  tradeAttempted?: {
    symbol: string;
    side: 'buy' | 'sell';
    status: 'submitted' | 'rejected';
    reason?: string;
  };
  researchResult?: {
    symbols: string[];
    addedToWatchlist: boolean;
    pipelineTriggered: boolean;
  };
}
