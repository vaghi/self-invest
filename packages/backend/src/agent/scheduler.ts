import cron from 'node-cron';
import { runPipeline } from './pipeline.js';
import { transitionTo, getAgentState, isDead } from './state-machine.js';
import { isMarketOpen, getEffectiveInterval } from './market-hours.js';
import { getActiveBroker } from '../broker/factory.js';
import { getActiveAIProvider } from '../ai/factory.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

let task: cron.ScheduledTask | null = null;
let running = false;
let lastRunAt = 0;
let currentMarketInterval = env.agentAnalysisIntervalMinutes;
let currentOffHoursInterval = env.agentOffHoursIntervalMinutes;

export function startAgent(runImmediately = true): boolean {
  if (isDead()) {
    logger.warn('Cannot start dead agent');
    return false;
  }

  if (task) {
    logger.warn('Agent already running');
    return false;
  }

  // Run cron every minute; dynamically skip based on effective interval
  task = cron.schedule('* * * * *', async () => {
    if (running || isDead()) return;

    const effectiveInterval = getEffectiveInterval(currentMarketInterval, currentOffHoursInterval);
    const now = Date.now();
    if (now - lastRunAt < effectiveInterval * 60 * 1000) return;

    running = true;
    lastRunAt = now;
    try {
      await runPipeline();
    } catch (err) {
      logger.error({ err }, 'Agent pipeline crashed');
    } finally {
      running = false;
    }
  });

  transitionTo('idle');
  logger.info({
    marketInterval: currentMarketInterval,
    offHoursInterval: currentOffHoursInterval,
    marketOpen: isMarketOpen(),
  }, 'Agent started');

  if (runImmediately) {
    setImmediate(async () => {
      if (running || isDead()) return;
      running = true;
      lastRunAt = Date.now();
      try {
        await runPipeline();
      } catch (err) {
        logger.error({ err }, 'Agent immediate first-run crashed');
      } finally {
        running = false;
      }
    });
  }

  return true;
}

export function stopAgent(): void {
  if (task) {
    task.stop();
    task = null;
  }
  if (!isDead()) {
    transitionTo('idle');
  }
  logger.info('Agent stopped');
}

export function pauseAgent(): void {
  if (task) {
    task.stop();
  }
  transitionTo('paused');
  logger.info('Agent paused');
}

export function resumeAgent(): void {
  if (task) {
    task.start();
  } else {
    startAgent();
    return;
  }
  transitionTo('idle');
  logger.info('Agent resumed');
}

export async function triggerAnalysis(): Promise<void> {
  if (isDead()) throw new Error('Agent is dead');
  if (running) throw new Error('Analysis already running');

  running = true;
  lastRunAt = Date.now();
  try {
    await runPipeline();
  } finally {
    running = false;
  }
}

export function setAnalysisInterval(minutes: number): void {
  if (minutes < 1 || minutes > 60) throw new Error('Interval must be between 1 and 60 minutes');
  currentMarketInterval = minutes;
  logger.info({ interval: minutes }, 'Analysis interval updated');
}

export async function autoStartAgent(): Promise<boolean> {
  if (!env.agentAutoStart || !env.agentEnabled) {
    logger.info('Agent auto-start disabled via env');
    return false;
  }

  const broker = getActiveBroker();
  if (!broker || !broker.isConnected()) {
    logger.warn('Auto-start skipped: broker not connected');
    return false;
  }

  const ai = getActiveAIProvider();
  if (!ai) {
    logger.warn('Auto-start skipped: AI provider not configured');
    return false;
  }

  logger.info('Auto-starting agent after state restoration');
  return startAgent(true);
}

export function getSchedulerStatus() {
  const marketOpen = isMarketOpen();
  return {
    running: task !== null,
    agentState: getAgentState(),
    intervalMinutes: marketOpen ? currentMarketInterval : currentOffHoursInterval,
    pipelineRunning: running,
    marketOpen,
    lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null,
  };
}
