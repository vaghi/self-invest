import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '../config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.js';
import { portfolioRouter } from './routes/portfolio.js';
import { tradesRouter } from './routes/trades.js';
import { marketDataRouter } from './routes/market-data.js';
import { agentRouter } from './routes/ai-agent.js';
import { settingsRouter } from './routes/settings.js';

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/portfolio', portfolioRouter);
  app.use('/api/trades', tradesRouter);
  app.use('/api/market', marketDataRouter);
  app.use('/api/agent', agentRouter);
  app.use('/api/settings', settingsRouter);

  app.use(errorHandler);

  return app;
}
