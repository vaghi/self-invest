import { z } from 'zod';
import { marketAnalysisResultSchema, tradeDecisionResultSchema } from '@self-invest/shared';
import type { MarketAnalysisResult, TradeDecisionResult } from '@self-invest/shared';
import { logger } from '../config/logger.js';

export function parseMarketAnalysis(content: string): MarketAnalysisResult | null {
  const json = extractJson(content);
  if (!json) return null;

  const result = marketAnalysisResultSchema.safeParse(json);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten() }, 'Market analysis response validation failed');
    return null;
  }
  return result.data;
}

export function parseTradeDecision(content: string): TradeDecisionResult | null {
  const json = extractJson(content);
  if (!json) return null;

  const result = tradeDecisionResultSchema.safeParse(json);
  if (!result.success) {
    logger.warn({ errors: result.error.flatten() }, 'Trade decision response validation failed');
    return null;
  }
  return result.data;
}

function extractJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[1] || match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
