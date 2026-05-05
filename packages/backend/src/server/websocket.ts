import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { eventBus } from '../services/event-bus.js';
import { logger } from '../config/logger.js';

let wss: WebSocketServer;

export function setupWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    logger.debug('WebSocket client connected');

    ws.on('close', () => {
      logger.debug('WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'WebSocket error');
    });
  });

  eventBus.onEvent((event) => {
    broadcast(JSON.stringify(event));
  });

  logger.info('WebSocket server initialized');
}

function broadcast(data: string): void {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}
