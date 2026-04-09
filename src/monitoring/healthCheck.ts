import { getPool } from '../database/pool';
import { logger } from '../utils/logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latency?: number; error?: string }>;
  uptime: number;
  version: string;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = {};

  // Postgres
  try {
    const start = Date.now();
    await getPool().query('SELECT 1');
    checks.postgres = { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    checks.postgres = { status: 'error', error: (err as Error).message };
  }

  // Redis
  try {
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: 'ok', latency: Date.now() - start };
    await redis.quit();
  } catch (err) {
    checks.redis = { status: 'error', error: (err as Error).message };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const anyError = Object.values(checks).some((c) => c.status === 'error');

  return {
    status: allOk ? 'healthy' : anyError ? 'unhealthy' : 'degraded',
    checks,
    uptime: process.uptime(),
    version: '0.1.0',
  };
}
