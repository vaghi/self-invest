import { Router } from 'express';
import { createBrokerAdapter, getActiveBroker } from '../../broker/factory.js';
import { encrypt, maskApiKey } from '../../services/credential-store.js';
import { trackError } from '../../services/error-tracker.js';
import { brokerCredentialsSchema } from '@self-invest/shared';
import { prisma } from '../../db/client.js';
import { logger } from '../../config/logger.js';

export const authRouter = Router();

authRouter.post('/broker/connect', async (req, res) => {
  try {
    const parsed = brokerCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid credentials', details: parsed.error.flatten() });
      return;
    }

    const { apiKey, apiSecret, isPaperTrading } = parsed.data;
    const brokerType = (req.body.brokerType as string) || 'alpaca';

    const adapter = createBrokerAdapter(brokerType as any);
    await adapter.connect(apiKey, apiSecret, isPaperTrading);

    const account = await adapter.getAccount();

    await prisma.brokerConnection.updateMany({ data: { isActive: false } });
    await prisma.brokerConnection.create({
      data: {
        brokerType: brokerType.toUpperCase() as any,
        encryptedApiKey: encrypt(apiKey),
        encryptedSecret: encrypt(apiSecret),
        isPaperTrading,
        isActive: true,
      },
    });

    logger.info({ broker: brokerType, paper: isPaperTrading }, 'Broker connected');

    res.json({
      connected: true,
      account: {
        id: account.id,
        equity: account.equity,
        cash: account.cash,
        status: account.status,
      },
      isPaperTrading,
      maskedApiKey: maskApiKey(apiKey),
    });
  } catch (err: any) {
    trackError('broker_connection', err, { brokerType: req.body.brokerType });
    res.status(400).json({ error: 'Failed to connect', message: err.message });
  }
});

authRouter.get('/broker/status', async (_req, res) => {
  const broker = getActiveBroker();
  if (!broker || !broker.isConnected()) {
    res.json({ connected: false });
    return;
  }

  try {
    const account = await broker.getAccount();
    res.json({
      connected: true,
      isPaperTrading: broker.isPaperTrading(),
      account: {
        id: account.id,
        equity: account.equity,
        cash: account.cash,
        status: account.status,
      },
    });
  } catch (err: any) {
    res.json({ connected: false, error: err.message });
  }
});

authRouter.post('/broker/disconnect', async (_req, res) => {
  const broker = getActiveBroker();
  if (broker) {
    await broker.disconnect();
  }
  await prisma.brokerConnection.updateMany({ data: { isActive: false } });
  res.json({ disconnected: true });
});
