import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

const SESSION_PREFIX = 'session:';
const DEFAULT_TTL = 7 * 24 * 3600; // 7 days

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redis.url);
  }
  return redis;
}

export interface SessionData {
  agentId: string;
  handle: string;
  createdAt: string;
  lastActive: string;
  ip?: string;
  userAgent?: string;
}

export class SessionStore {
  static async create(sessionId: string, data: SessionData): Promise<void> {
    await getRedis().setex(
      `${SESSION_PREFIX}${sessionId}`,
      DEFAULT_TTL,
      JSON.stringify(data),
    );
    // Track active sessions per agent
    await getRedis().sadd(`agent-sessions:${data.agentId}`, sessionId);
  }

  static async get(sessionId: string): Promise<SessionData | null> {
    const raw = await getRedis().get(`${SESSION_PREFIX}${sessionId}`);
    if (!raw) return null;
    // Refresh TTL on access
    await getRedis().expire(`${SESSION_PREFIX}${sessionId}`, DEFAULT_TTL);
    return JSON.parse(raw);
  }

  static async update(sessionId: string, patch: Partial<SessionData>): Promise<void> {
    const existing = await this.get(sessionId);
    if (!existing) return;
    await getRedis().setex(
      `${SESSION_PREFIX}${sessionId}`,
      DEFAULT_TTL,
      JSON.stringify({ ...existing, ...patch, lastActive: new Date().toISOString() }),
    );
  }

  static async destroy(sessionId: string): Promise<void> {
    const data = await this.get(sessionId);
    await getRedis().del(`${SESSION_PREFIX}${sessionId}`);
    if (data) {
      await getRedis().srem(`agent-sessions:${data.agentId}`, sessionId);
    }
  }

  static async getActiveSessions(agentId: string): Promise<string[]> {
    return getRedis().smembers(`agent-sessions:${agentId}`);
  }

  static async destroyAllForAgent(agentId: string): Promise<void> {
    const sessions = await this.getActiveSessions(agentId);
    const pipeline = getRedis().pipeline();
    sessions.forEach((sid) => pipeline.del(`${SESSION_PREFIX}${sid}`));
    pipeline.del(`agent-sessions:${agentId}`);
    await pipeline.exec();
    logger.info('All sessions destroyed', { agentId, count: sessions.length });
  }
}
