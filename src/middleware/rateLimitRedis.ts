import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url);
  }
  return redis;
}

/**
 * Redis-backed rate limiter using sliding window.
 * Replaces in-memory rate limiter for multi-instance deployments.
 */
export function redisRateLimit(options?: { windowMs?: number; max?: number; keyPrefix?: string }) {
  const windowMs = options?.windowMs || config.rateLimit.windowMs;
  const max = options?.max || config.rateLimit.maxRequests;
  const prefix = options?.keyPrefix || 'rl';

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${prefix}:${req.agent?.agentId || req.ip || 'anon'}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const r = getRedis();
      const multi = r.multi();
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zadd(key, now.toString(), `${now}-${Math.random()}`);
      multi.zcard(key);
      multi.pexpire(key, windowMs);
      const results = await multi.exec();

      const count = results?.[2]?.[1] as number || 0;

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      if (count > max) {
        logger.warn('Rate limit exceeded (Redis)', { key, count, max });
        return next(AppError.tooMany());
      }

      return next();
    } catch (err) {
      // Fallback: allow request if Redis is down
      logger.error('Redis rate limit error, allowing request', { error: (err as Error).message });
      return next();
    }
  };
}
