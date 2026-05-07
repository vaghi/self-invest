import { Router } from 'express';
import {
  startAgent, stopAgent, pauseAgent, resumeAgent,
  triggerAnalysis, getSchedulerStatus,
} from '../../agent/scheduler.js';
import { getAgentState, getAgentUptime, getLastError } from '../../agent/state-machine.js';
import { getActiveBroker } from '../../broker/factory.js';
import { getActiveAIProvider } from '../../ai/factory.js';
import { prisma } from '../../db/client.js';

export const agentRouter = Router();

agentRouter.get('/status', async (_req, res) => {
  const scheduler = getSchedulerStatus();
  const totalTrades = await prisma.trade.count();
  const filledTrades = await prisma.trade.count({ where: { status: 'FILLED' } });

  res.json({
    state: getAgentState(),
    lastError: getLastError(),
    uptime: getAgentUptime(),
    totalTradesExecuted: totalTrades,
    successRate: totalTrades > 0 ? filledTrades / totalTrades : 0,
    scheduler,
  });
});

agentRouter.post('/start', async (_req, res) => {
  const broker = getActiveBroker();
  if (!broker || !broker.isConnected()) {
    res.status(400).json({ error: 'Broker not connected. Go to Settings and connect your Alpaca API keys first.' });
    return;
  }

  const ai = getActiveAIProvider();
  if (!ai) {
    res.status(400).json({ error: 'AI provider not configured. Go to Settings and select an AI provider (Claude, OpenAI, Grok, or Ollama).' });
    return;
  }

  const started = startAgent();
  if (!started) {
    res.status(400).json({ error: 'Agent could not start. It may already be running or has been terminated.' });
    return;
  }

  res.json({ started, state: getAgentState() });
});

agentRouter.post('/stop', async (_req, res) => {
  stopAgent();
  res.json({ stopped: true, state: getAgentState() });
});

agentRouter.post('/pause', async (_req, res) => {
  pauseAgent();
  res.json({ paused: true, state: getAgentState() });
});

agentRouter.post('/resume', async (_req, res) => {
  const broker = getActiveBroker();
  if (!broker || !broker.isConnected()) {
    res.status(400).json({ error: 'Broker not connected. Go to Settings and reconnect your broker.' });
    return;
  }

  const ai = getActiveAIProvider();
  if (!ai) {
    res.status(400).json({ error: 'AI provider not configured. Go to Settings and select an AI provider.' });
    return;
  }

  resumeAgent();
  res.json({ resumed: true, state: getAgentState() });
});

agentRouter.post('/analyze-now', async (_req, res) => {
  const broker = getActiveBroker();
  if (!broker || !broker.isConnected()) {
    res.status(400).json({ error: 'Broker not connected. Go to Settings and connect your Alpaca API keys first.' });
    return;
  }

  const ai = getActiveAIProvider();
  if (!ai) {
    res.status(400).json({ error: 'AI provider not configured. Go to Settings and select an AI provider.' });
    return;
  }

  try {
    await triggerAnalysis();
    res.json({ triggered: true, state: getAgentState() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

agentRouter.get('/analyses', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const analyses = await prisma.aIAnalysis.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json(analyses);
});

agentRouter.get('/events', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const events = await prisma.agentEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json(events);
});
