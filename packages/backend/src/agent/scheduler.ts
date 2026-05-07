import cron from 'node-cron';
import { runPipeline } from './pipeline.js';
import { transitionTo, getAgentState, isDead } from './state-machine.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

let task: cron.ScheduledTask | null = null;
let running = false;
let currentInterval = env.agentAnalysisIntervalMinutes;

export function startAgent(): boolean {
  if (isDead()) {
    logger.warn('Cannot start dead agent');
    return false;
  }

  if (task) {
    logger.warn('Agent already running');
    return false;
  }

  const cronExpression = `*/${currentInterval} * * * *`;

  task = cron.schedule(cronExpression, async () => {
    if (running || isDead()) return;
    running = true;
    try {
      await runPipeline();
    } catch (err) {
      logger.error({ err }, 'Agent pipeline crashed');
    } finally {
      running = false;
    }
  });

  transitionTo('idle');
  logger.info({ interval: currentInterval }, 'Agent started');
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
  try {
    await runPipeline();
  } finally {
    running = false;
  }
}

export function setAnalysisInterval(minutes: number): void {
  if (minutes < 1 || minutes > 60) throw new Error('Interval must be between 1 and 60 minutes');
  currentInterval = minutes;
  if (task) {
    task.stop();
    task = null;
    startAgent();
    logger.info({ interval: minutes }, 'Agent restarted with new interval');
  }
}

export function getSchedulerStatus() {
  return {
    running: task !== null,
    agentState: getAgentState(),
    intervalMinutes: currentInterval,
    pipelineRunning: running,
  };
}
