import { Router } from 'express';
import type { AIProviderType } from '@self-invest/shared';
import { aiProviderConfigSchema, riskConfigSchema, AI_PROVIDER_MODELS } from '@self-invest/shared';
import { createAIProvider, getActiveAIProvider } from '../../ai/factory.js';
import { updateRiskConfig, getRiskConfig } from '../../risk/manager.js';
import { getSchedulerStatus, setAnalysisInterval } from '../../agent/scheduler.js';
import { encrypt, maskApiKey } from '../../services/credential-store.js';
import { prisma } from '../../db/client.js';

export const settingsRouter = Router();

settingsRouter.get('/ai-provider', async (_req, res) => {
  const provider = getActiveAIProvider();
  let healthy = false;
  if (provider) {
    try {
      healthy = await provider.healthCheck();
    } catch {
      healthy = false;
    }
  }
  res.json({
    active: provider ? {
      type: provider.name,
      model: provider.model,
      isLocal: provider.isLocal,
      healthy,
    } : null,
    availableProviders: AI_PROVIDER_MODELS,
  });
});

settingsRouter.post('/ai-provider', async (req, res) => {
  try {
    const parsed = aiProviderConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid config', details: parsed.error.flatten() });
      return;
    }

    const apiKey = req.body.apiKey as string | undefined;

    let provider;
    try {
      provider = createAIProvider(parsed.data.type as AIProviderType, parsed.data.model, apiKey);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
      return;
    }

    const healthy = await provider.healthCheck();

    if (!healthy) {
      const { getRecentErrors } = await import('../../services/error-tracker.js');
      const recent = getRecentErrors(1);
      const detail = recent[0]?.message || '';
      res.status(400).json({
        error: `Health check failed for ${parsed.data.type}/${parsed.data.model}. ${detail}`.trim(),
      });
      return;
    }

    const persistedConfig: Record<string, unknown> = {
      type: parsed.data.type,
      model: parsed.data.model,
    };
    if (apiKey) {
      persistedConfig.encryptedApiKey = encrypt(apiKey);
    }

    await prisma.settings.upsert({
      where: { key: 'ai_provider' },
      create: { key: 'ai_provider', value: persistedConfig as any },
      update: { value: persistedConfig as any },
    });

    res.json({
      active: { type: provider.name, model: provider.model, isLocal: provider.isLocal, healthy: true },
      healthy: true,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

settingsRouter.get('/risk', (_req, res) => {
  res.json(getRiskConfig());
});

settingsRouter.put('/risk', async (req, res) => {
  const parsed = riskConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid risk config', details: parsed.error.flatten() });
    return;
  }
  updateRiskConfig(parsed.data);

  await prisma.riskConfiguration.updateMany({ data: { isActive: false } });
  await prisma.riskConfiguration.create({
    data: {
      ...parsed.data,
      isActive: true,
    },
  });

  res.json(getRiskConfig());
});

settingsRouter.get('/interval', (_req, res) => {
  const status = getSchedulerStatus();
  res.json({ intervalMinutes: status.intervalMinutes });
});

settingsRouter.put('/interval', async (req, res) => {
  const minutes = parseInt(req.body.intervalMinutes);
  if (!minutes || minutes < 1 || minutes > 60) {
    res.status(400).json({ error: 'Interval must be between 1 and 60 minutes' });
    return;
  }
  try {
    setAnalysisInterval(minutes);
    await prisma.settings.upsert({
      where: { key: 'analysis_interval' },
      create: { key: 'analysis_interval', value: { intervalMinutes: minutes } as any },
      update: { value: { intervalMinutes: minutes } as any },
    });
    res.json({ intervalMinutes: minutes });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

settingsRouter.get('/all', async (_req, res) => {
  const settings = await prisma.settings.findMany();
  const map: Record<string, unknown> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  res.json({
    ...map,
    risk: getRiskConfig(),
    aiProvider: getActiveAIProvider() ? {
      type: getActiveAIProvider()!.name,
      model: getActiveAIProvider()!.model,
    } : null,
  });
});
