import { prisma } from '../db/client.js';
import { decrypt } from './credential-store.js';
import { createBrokerAdapter } from '../broker/factory.js';
import { createAIProvider } from '../ai/factory.js';
import { updateRiskConfig } from '../risk/manager.js';
import { setAnalysisInterval } from '../agent/scheduler.js';
import { logger } from '../config/logger.js';
import { trackError } from './error-tracker.js';
import type { AIProviderType } from '@self-invest/shared';

export async function restoreState(): Promise<void> {
  await restoreBrokerConnection();
  await restoreAIProvider();
  await restoreRiskConfig();
  await restoreAnalysisInterval();
}

async function restoreBrokerConnection(): Promise<void> {
  try {
    const connection = await prisma.brokerConnection.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connection) {
      logger.info('No stored broker connection to restore');
      return;
    }

    const apiKey = decrypt(connection.encryptedApiKey);
    const apiSecret = decrypt(connection.encryptedSecret);
    const brokerType = connection.brokerType.toLowerCase() as 'alpaca';

    const adapter = createBrokerAdapter(brokerType);
    await adapter.connect(apiKey, apiSecret, connection.isPaperTrading);

    logger.info({
      broker: brokerType,
      paper: connection.isPaperTrading,
    }, 'Broker connection restored from database');
  } catch (err) {
    trackError('broker_connection', err, { context: 'restore_on_startup' });
    logger.warn('Failed to restore broker connection — user will need to reconnect in Settings');
  }
}

async function restoreAIProvider(): Promise<void> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'ai_provider' },
    });

    if (!setting) {
      logger.info('No stored AI provider to restore');
      return;
    }

    const config = setting.value as { type: string; model: string; encryptedApiKey?: string };
    if (!config.type || !config.model) return;

    let apiKey: string | undefined;
    if (config.encryptedApiKey) {
      try {
        apiKey = decrypt(config.encryptedApiKey);
      } catch {
        logger.warn('Failed to decrypt stored AI API key — user may need to re-enter it');
      }
    }

    const provider = createAIProvider(config.type as AIProviderType, config.model, apiKey);
    const healthy = await provider.healthCheck();

    if (healthy) {
      logger.info({ type: config.type, model: config.model }, 'AI provider restored from database');
    } else {
      logger.warn({ type: config.type, model: config.model }, 'AI provider restored but health check failed — may need reconfiguration');
    }
  } catch (err) {
    trackError('ai_provider', err, { context: 'restore_on_startup' });
    logger.warn('Failed to restore AI provider — user will need to reconfigure in Settings');
  }
}

async function restoreRiskConfig(): Promise<void> {
  try {
    const riskConfig = await prisma.riskConfiguration.findFirst({
      where: { isActive: true },
    });

    if (!riskConfig) return;

    updateRiskConfig({
      maxPositionSizePct: riskConfig.maxPositionSizePct,
      maxPortfolioDrawdownPct: riskConfig.maxPortfolioDrawdownPct,
      maxDailyLossPct: riskConfig.maxDailyLossPct,
      maxOpenPositions: riskConfig.maxOpenPositions,
      defaultStopLossPct: riskConfig.defaultStopLossPct,
      maxSectorConcentrationPct: riskConfig.maxSectorConcentrationPct,
      minCashReservePct: riskConfig.minCashReservePct,
    });

    logger.info('Risk configuration restored from database');
  } catch (err) {
    trackError('config', err, { context: 'restore_risk_config' });
  }
}

async function restoreAnalysisInterval(): Promise<void> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'analysis_interval' },
    });

    if (!setting) return;

    const config = setting.value as { intervalMinutes: number };
    if (config.intervalMinutes && config.intervalMinutes >= 1 && config.intervalMinutes <= 60) {
      setAnalysisInterval(config.intervalMinutes);
      logger.info({ intervalMinutes: config.intervalMinutes }, 'Analysis interval restored from database');
    }
  } catch (err) {
    trackError('config', err, { context: 'restore_analysis_interval' });
  }
}
