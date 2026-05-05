import { EventEmitter } from 'events';
import type { WSEvent, WSEventType } from '@self-invest/shared';

class EventBus extends EventEmitter {
  emit<T>(type: WSEventType, data: T): boolean {
    const event: WSEvent<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    return super.emit('ws_event', event);
  }

  onEvent(handler: (event: WSEvent) => void): void {
    this.on('ws_event', handler);
  }
}

export const eventBus = new EventBus();
eventBus.setMaxListeners(50);
