import { Router } from 'express';
import { requireBroker } from '../../broker/factory.js';
import { prisma } from '../../db/client.js';

export const portfolioRouter = Router();

portfolioRouter.get('/balance', async (_req, res) => {
  try {
    const broker = requireBroker();
    const balance = await broker.getBalance();
    res.json(balance);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

portfolioRouter.get('/positions', async (_req, res) => {
  try {
    const broker = requireBroker();
    const positions = await broker.getPositions();
    res.json(positions);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

portfolioRouter.get('/snapshots', async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { snapshotAt: { gte: since } },
    orderBy: { snapshotAt: 'asc' },
  });
  res.json(snapshots);
});

portfolioRouter.get('/summary', async (_req, res) => {
  try {
    const broker = requireBroker();
    const [balance, positions] = await Promise.all([
      broker.getBalance(),
      broker.getPositions(),
    ]);
    res.json({ balance, positions, positionCount: positions.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
