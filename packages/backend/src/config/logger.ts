import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.resolve(__dirname, '../../../../logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const transports = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      options: { colorize: true },
      level: 'debug',
    },
    {
      target: 'pino/file',
      options: { destination: path.join(logsDir, 'app.log') },
      level: 'info',
    },
    {
      target: 'pino/file',
      options: { destination: path.join(logsDir, 'error.log') },
      level: 'error',
    },
  ],
});

export const logger = pino({ level: 'debug' }, transports);
