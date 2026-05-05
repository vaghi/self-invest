import { Router } from 'express';
import type { AIProviderType } from '@self-invest/shared';
import { aiProviderConfigSchema, riskConfigSchema, AI_PROVIDER_MODELS } from '@self-invest/shared';
import { createAIProvider, getActiveAIProvider } from '../../ai/factory.js';
import { updateRiskConfig, getRiskConfig } from '../../risk/manager.js';
import { prisma } from '../../db/client.js';

export const settingsRouter = Router();

settingsRouter.get('/ai-provider', async (_req, res) => {
  const provider = getActiveAIProvider();
  res.json({
    active: provider ? {
      type: provider.name,
      model: provider.model,
      isLocal: provider.isLocal,
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

    const provider = createAIProvider(parsed.data.type as AIProviderType, parsed.data.model);
    const healthy = await provider.healthCheck();

    if (!healthy) {
      res.status(400).json({ error: 'Provider health check failed. Is the API key correct / is the local server running?' });
      return;
    }

    await prisma.settings.upsert({
      where: { key: 'ai_provider' },
      create: { key: 'ai_provider', value: parsed.data as any },
      update: { value: parsed.data as any },
    });

    res.json({
      active: { type: provider.name, model: provider.model, isLocal: provider.isLocal },
      healthy: true,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

settingsRouter.get('/risk', (_req, res) => {
  res.json(getRiskConfig());
});

settingsRouter.put('/risk', (req, res) => {
  const parsed = riskConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid risk config', details: parsed.error.flatten() });
    return;
  }
  updateRiskConfig(parsed.data);
  res.json(getRiskConfig());
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
