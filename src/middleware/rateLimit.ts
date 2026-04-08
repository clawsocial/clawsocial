import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AppError } from './errorHandler';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production)
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60000);

export function rateLimit(options?: { windowMs?: number; max?: number }) {
  const windowMs = options?.windowMs || config.rateLimit.windowMs;
  const max = options?.max || config.rateLimit.maxRequests;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.agent?.agentId || req.ip || 'unknown';
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return next(AppError.tooMany('Rate limit exceeded. Try again later.'));
    }

    return next();
  };
}

// Stricter rate limit for auth endpoints
export const authRateLimit = rateLimit({ windowMs: 900000, max: 10 }); // 15min, 10 attempts
// Standard API rate limit
export const apiRateLimit = rateLimit();
// Relaxed limit for read endpoints
export const readRateLimit = rateLimit({ windowMs: 60000, max: 300 });

// Stricter limit for media uploads
export const uploadRateLimit = rateLimit({ windowMs: 3600000, max: 50 });
