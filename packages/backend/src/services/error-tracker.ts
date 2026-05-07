import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.resolve(__dirname, '../../../../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export type ErrorCategory =
  | 'broker_connection'
  | 'broker_request'
  | 'ai_provider'
  | 'ai_response_parse'
  | 'agent_pipeline'
  | 'risk_validation'
  | 'trade_execution'
  | 'database'
  | 'websocket'
  | 'market_data'
  | 'config'
  | 'unknown';

interface ErrorEntry {
  timestamp: string;
  category: ErrorCategory;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

const errorLogPath = path.join(logsDir, 'errors.jsonl');

export function trackError(
  category: ErrorCategory,
  error: unknown,
  details?: Record<string, unknown>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));

  const entry: ErrorEntry = {
    timestamp: new Date().toISOString(),
    category,
    message: err.message,
    details,
    stack: err.stack,
  };

  logger.error({ category, details }, err.message);

  const line = JSON.stringify(entry) + '\n';
  fs.appendFile(errorLogPath, line, (writeErr) => {
    if (writeErr) {
      console.error('Failed to write error log:', writeErr);
    }
  });
}

export function getRecentErrors(limit = 50): ErrorEntry[] {
  try {
    if (!fs.existsSync(errorLogPath)) return [];
    const content = fs.readFileSync(errorLogPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line))
      .reverse();
  } catch {
    return [];
  }
}

export function clearErrorLog(): void {
  fs.writeFileSync(errorLogPath, '');
}
