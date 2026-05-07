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
      const raw = match[1] || match[0];
      try {
        return JSON.parse(raw);
      } catch {
        return tryRepairJson(raw);
      }
    }
    return tryRepairJson(content);
  }
}

function tryRepairJson(raw: string): unknown {
  let str = raw.trim();
  if (!str.startsWith('{')) {
    const idx = str.indexOf('{');
    if (idx === -1) return null;
    str = str.slice(idx);
  }

  let openBraces = 0;
  let openBrackets = 0;
  for (const ch of str) {
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  while (openBrackets > 0) { str += ']'; openBrackets--; }
  while (openBraces > 0) { str += '}'; openBraces--; }

  str = str.replace(/,\s*([}\]])/g, '$1');
  str = str.replace(/,\s*$/, '');

  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
