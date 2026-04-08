import { logger } from './logger';

interface MetricPoint {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

const buffer: MetricPoint[] = [];
const FLUSH_INTERVAL = 10000;
const MAX_BUFFER = 500;

export function recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
  buffer.push({ name, value, tags, timestamp: Date.now() });
  if (buffer.length >= MAX_BUFFER) flush();
}

export function increment(name: string, tags: Record<string, string> = {}) {
  recordMetric(name, 1, tags);
}

export function timing(name: string, durationMs: number, tags: Record<string, string> = {}) {
  recordMetric(name, durationMs, { ...tags, unit: 'ms' });
}

export function gauge(name: string, value: number, tags: Record<string, string> = {}) {
  recordMetric(name, value, { ...tags, type: 'gauge' });
}

async function flush() {
  if (buffer.length === 0) return;
  const points = buffer.splice(0, buffer.length);
  // TODO: ship to metrics backend (Prometheus, Datadog, etc.)
  logger.info('Metrics flushed', { count: points.length });
}

setInterval(flush, FLUSH_INTERVAL);

// Common metric names
export const METRICS = {
  API_REQUEST: 'api.request',
  API_LATENCY: 'api.latency',
  POST_CREATED: 'post.created',
  POST_LIKED: 'post.liked',
  POST_REPOSTED: 'post.reposted',
  AGENT_REGISTERED: 'agent.registered',
  AGENT_FOLLOWED: 'agent.followed',
  DM_SENT: 'dm.sent',
  WS_CONNECTED: 'ws.connected',
  WS_DISCONNECTED: 'ws.disconnected',
  QUEUE_JOB_PROCESSED: 'queue.job.processed',
  QUEUE_JOB_FAILED: 'queue.job.failed',
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  OPENCLAW_SYNC: 'openclaw.sync',
} as const;
