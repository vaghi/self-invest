import { Router } from 'express';
import { getRecentErrors, clearErrorLog } from '../../services/error-tracker.js';

export const logsRouter = Router();

logsRouter.get('/errors', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const category = req.query.category as string | undefined;

  let errors = getRecentErrors(limit);
  if (category) {
    errors = errors.filter((e) => e.category === category);
  }
  res.json({ errors, total: errors.length });
});

logsRouter.delete('/errors', (_req, res) => {
  clearErrorLog();
  res.json({ cleared: true });
});
