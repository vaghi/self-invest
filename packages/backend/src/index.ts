import http from 'http';
import { createApp } from './server/app.js';
import { setupWebSocket } from './server/websocket.js';
import { connectDatabase } from './db/client.js';
import { connectRedis } from './services/cache.js';
import { restoreState } from './services/startup-restore.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

async function main() {
  await connectDatabase();
  logger.info('Database connected');

  await connectRedis();
  await restoreState();

  const app = createApp();
  const server = http.createServer(app);

  setupWebSocket(server);

  server.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, 'Self-Invest backend running');
    logger.info(`API: http://localhost:${env.port}/api/health`);
    logger.info(`WebSocket: ws://localhost:${env.port}/ws`);
  });

  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
