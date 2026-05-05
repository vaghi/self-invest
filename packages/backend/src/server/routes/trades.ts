import { Router } from 'express';
import { prisma } from '../../db/client.js';

export const tradesRouter = Router();

tradesRouter.get('/', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const symbol = req.query.symbol as string | undefined;
  const side = req.query.side as string | undefined;

  const where: any = {};
  if (symbol) where.symbol = symbol;
  if (side) where.side = side.toUpperCase();

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { aiAnalysis: { select: { id: true, reasoning: true, confidence: true } } },
    }),
    prisma.trade.count({ where }),
  ]);

  res.json({
    trades,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

tradesRouter.get('/stats', async (_req, res) => {
  const totalTrades = await prisma.trade.count();
  const filledTrades = await prisma.trade.count({ where: { status: 'FILLED' } });
  const recentTrades = await prisma.trade.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  res.json({ totalTrades, filledTrades, recentTrades });
});
