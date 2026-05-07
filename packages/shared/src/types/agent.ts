export type AgentState = 'idle' | 'analyzing' | 'trading' | 'paused' | 'dead' | 'error';

export interface AgentStatus {
  state: AgentState;
  lastAnalysisAt?: string;
  nextAnalysisAt?: string;
  currentAction?: string;
  totalTradesExecuted: number;
  successRate: number;
  uptime: number;
  deathReason?: string;
}

export type WSEventType =
  | 'portfolio_update'
  | 'position_update'
  | 'trade_executed'
  | 'agent_state_change'
  | 'analysis_update'
  | 'price_update'
  | 'agent_death'
  | 'chat_message'
  | 'error';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  data: T;
  timestamp: string;
}

export interface AgentStateChange {
  from: AgentState;
  to: AgentState;
  reason?: string;
}

export interface AgentDeathEvent {
  finalBalance: string;
  totalTrades: number;
  totalPnL: string;
  lifespan: number;
  reason: string;
}
