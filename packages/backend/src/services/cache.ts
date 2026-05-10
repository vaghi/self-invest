import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let redis: Redis | null = null;
let available = false;

export async function connectRedis(): Promise<void> {
  try {
    redis = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    });

    redis.on('error', () => {
      if (available) {
        logger.warn('Redis connection lost — cache disabled, operating without cache');
        available = false;
      }
    });

    redis.on('connect', () => {
      if (!available) {
        logger.info('Redis connected — cache enabled');
        available = true;
      }
    });

    await redis.connect();
    available = true;
  } catch {
    logger.warn('Redis unavailable — running without cache');
    redis = null;
    available = false;
  }
}

export async function cached<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
  if (!available || !redis) {
    return fetchFn();
  }

  const cacheKey = `si:${key}`;

  try {
    const hit = await redis.get(cacheKey);
    if (hit) {
      return JSON.parse(hit) as T;
    }
  } catch {}

  const result = await fetchFn();

  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', ttlSeconds);
  } catch {}

  return result;
}

export async function invalidate(...patterns: string[]): Promise<void> {
  if (!available || !redis) return;

  try {
    for (const pattern of patterns) {
      const keys = await redis.keys(`si:${pattern}`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch {}
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!available || !redis) return;
  try {
    await redis.set(`si:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {}
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!available || !redis) return null;
  try {
    const hit = await redis.get(`si:${key}`);
    return hit ? JSON.parse(hit) as T : null;
  } catch {
    return null;
  }
}
