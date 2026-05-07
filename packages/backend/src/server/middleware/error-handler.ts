import type { Request, Response, NextFunction } from 'express';
import { trackError } from '../../services/error-tracker.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  trackError('unknown', err, { path: req.path, method: req.method });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
