import type { AgentState, AgentStateChange } from '@self-invest/shared';
import { logger } from '../config/logger.js';
import { eventBus } from '../services/event-bus.js';

let currentState: AgentState = 'idle';
let startedAt: number | null = null;

const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  idle: ['analyzing', 'paused', 'dead'],
  analyzing: ['trading', 'idle', 'paused', 'error', 'dead'],
  trading: ['idle', 'analyzing', 'paused', 'error', 'dead'],
  paused: ['idle', 'analyzing', 'dead'],
  error: ['idle', 'paused', 'dead'],
  dead: [],
};

export function getAgentState(): AgentState {
  return currentState;
}

export function getAgentUptime(): number {
  return startedAt ? Date.now() - startedAt : 0;
}

export function transitionTo(newState: AgentState, reason?: string): boolean {
  if (currentState === newState) return true;

  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed.includes(newState)) {
    logger.warn({ from: currentState, to: newState }, 'Invalid state transition');
    return false;
  }

  const change: AgentStateChange = { from: currentState, to: newState, reason };
  logger.info(change, 'Agent state transition');

  currentState = newState;

  if (newState === 'analyzing' && !startedAt) {
    startedAt = Date.now();
  }
  if (newState === 'dead' || newState === 'idle') {
    startedAt = null;
  }

  eventBus.emit('agent_state_change', change);
  return true;
}

export function isDead(): boolean {
  return currentState === 'dead';
}

export function isActive(): boolean {
  return currentState === 'analyzing' || currentState === 'trading';
}
