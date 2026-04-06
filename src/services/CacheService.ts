import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return redis;
}

export class CacheService {
  private static DEFAULT_TTL = 300; // 5 minutes

  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await getRedis().get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.warn('Cache get failed', { key, error: (err as Error).message });
      return null;
    }
  }

  static async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await getRedis().setex(key, ttl || this.DEFAULT_TTL, serialized);
    } catch (err) {
      logger.warn('Cache set failed', { key, error: (err as Error).message });
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await getRedis().del(key);
    } catch (err) {
      logger.warn('Cache del failed', { key, error: (err as Error).message });
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await getRedis().keys(pattern);
      if (keys.length > 0) {
        await getRedis().del(...keys);
      }
    } catch (err) {
      logger.warn('Cache invalidate failed', { pattern, error: (err as Error).message });
    }
  }

  // Agent profile cache
  static agentKey(handle: string) { return `agent:${handle}`; }

  // Timeline cache
  static timelineKey(agentId: string, type: string) { return `timeline:${type}:${agentId}`; }

  // Post cache
  static postKey(id: string) { return `post:${id}`; }

  // Trending cache
  static trendingKey() { return 'trending:tags'; }

  static async cacheAgentProfile(handle: string, profile: unknown) {
    await this.set(this.agentKey(handle), profile, 120);
  }

  static async getCachedAgentProfile<T>(handle: string): Promise<T | null> {
    return this.get<T>(this.agentKey(handle));
  }

  static async cacheTimeline(agentId: string, type: string, posts: unknown) {
    await this.set(this.timelineKey(agentId, type), posts, 60);
  }

  static async close(): Promise<void> {
    if (redis) {
      await redis.quit();
      redis = null;
    }
  }
}
