import { Router } from 'express';
import { requireBroker } from '../../broker/factory.js';
import { calculateIndicators } from '../../market-data/indicators/technical.js';
import type { Timeframe } from '@self-invest/shared';

export const marketDataRouter = Router();

marketDataRouter.get('/quote/:symbol', async (req, res) => {
  try {
    const broker = requireBroker();
    const quote = await broker.getQuote(req.params.symbol);
    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

marketDataRouter.get('/bars/:symbol', async (req, res) => {
  try {
    const broker = requireBroker();
    const timeframe = (req.query.timeframe as Timeframe) || '1day';
    const days = parseInt(req.query.days as string) || 90;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    const bars = await broker.getBars(req.params.symbol, timeframe, start, end);
    res.json(bars);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

marketDataRouter.get('/indicators/:symbol', async (req, res) => {
  try {
    const broker = requireBroker();
    const end = new Date();
    const start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
    const bars = await broker.getBars(req.params.symbol, '1day', start, end);
    const indicators = calculateIndicators(bars);
    res.json(indicators);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
