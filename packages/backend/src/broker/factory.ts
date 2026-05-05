import type { IBrokerAdapter } from './interface.js';
import { AlpacaAdapter } from './alpaca/adapter.js';

export type BrokerName = 'alpaca';

const adapters: Record<BrokerName, new () => IBrokerAdapter> = {
  alpaca: AlpacaAdapter,
};

let activeAdapter: IBrokerAdapter | null = null;

export function createBrokerAdapter(name: BrokerName): IBrokerAdapter {
  const AdapterClass = adapters[name];
  if (!AdapterClass) {
    throw new Error(`Unknown broker: ${name}`);
  }
  activeAdapter = new AdapterClass();
  return activeAdapter;
}

export function getActiveBroker(): IBrokerAdapter | null {
  return activeAdapter;
}

export function requireBroker(): IBrokerAdapter {
  if (!activeAdapter || !activeAdapter.isConnected()) {
    throw new Error('No broker connected');
  }
  return activeAdapter;
}
