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

export function parseJsonFromAI(content: string): unknown {
  return extractJson(content);
}

function extractJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    // Try markdown code block first
    const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) {
      try {
        return JSON.parse(codeBlock[1].trim());
      } catch {
        const repaired = tryRepairJson(codeBlock[1].trim());
        if (repaired) return repaired;
      }
    }

    // Try to find a top-level JSON object
    const objStr = extractOuterJson(content);
    if (objStr) {
      try {
        return JSON.parse(objStr);
      } catch {
        return tryRepairJson(objStr);
      }
    }

    return tryRepairJson(content);
  }
}

function extractOuterJson(content: string): string | null {
  const start = content.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < content.length; i++) {
    const ch = content[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return content.slice(start, i + 1);
      }
    }
  }

  // Unclosed — return what we have so the repair function can close it
  return content.slice(start);
}

function tryRepairJson(raw: string): unknown {
  let str = raw.trim();
  if (!str.startsWith('{')) {
    const idx = str.indexOf('{');
    if (idx === -1) return null;
    str = str.slice(idx);
  }

  // Strip control characters that break JSON (except \n \r \t inside strings)
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  // Fix single-quoted strings to double-quoted
  str = str.replace(/:\s*'([^']*)'/g, ': "$1"');

  // Fix unescaped newlines inside strings by replacing them with spaces
  str = fixUnescapedNewlines(str);

  // Remove trailing commas before } or ]
  str = str.replace(/,\s*([}\]])/g, '$1');

  // Remove trailing comma at end
  str = str.replace(/,\s*$/, '');

  // Close unclosed brackets/braces
  let openBraces = 0;
  let openBrackets = 0;
  let inStr = false;
  let esc = false;

  for (const ch of str) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }

  // If we're inside an unclosed string, close it
  if (inStr) str += '"';

  while (openBrackets > 0) { str += ']'; openBrackets--; }
  while (openBraces > 0) { str += '}'; openBraces--; }

  try {
    return JSON.parse(str);
  } catch {
    // Last resort: try to fix unescaped quotes inside string values
    const fixed = fixUnescapedQuotes(str);
    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

function fixUnescapedNewlines(str: string): string {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (escape) {
      escape = false;
      result += ch;
      continue;
    }

    if (ch === '\\') {
      escape = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString && (ch === '\n' || ch === '\r')) {
      result += ' ';
      continue;
    }

    result += ch;
  }

  return result;
}

function fixUnescapedQuotes(str: string): string {
  // Strategy: walk through the string and when we find a quote that would break
  // the JSON structure (not preceded by \ and not a structural quote), escape it.
  const chars = [...str];
  const result: string[] = [];
  let inString = false;
  let escape = false;
  let lastStructuralPos = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (escape) {
      escape = false;
      result.push(ch);
      continue;
    }

    if (ch === '\\') {
      escape = true;
      result.push(ch);
      continue;
    }

    if (ch === '"') {
      if (!inString) {
        inString = true;
        result.push(ch);
        lastStructuralPos = i;
      } else {
        // Check if this quote looks like the end of a string value
        // by peeking ahead for structural characters: , } ] or whitespace before them
        const rest = str.slice(i + 1).trimStart();
        if (rest.length === 0 || rest[0] === ',' || rest[0] === '}' || rest[0] === ']' || rest[0] === ':') {
          inString = false;
          result.push(ch);
          lastStructuralPos = i;
        } else {
          // This is an unescaped quote inside a string — escape it
          result.push('\\', '"');
        }
      }
      continue;
    }

    result.push(ch);
  }

  return result.join('');
}
