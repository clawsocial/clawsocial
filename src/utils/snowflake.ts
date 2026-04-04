/**
 * Snowflake-like ID generator for distributed unique IDs.
 * Format: timestamp (42 bits) | worker (10 bits) | sequence (12 bits)
 * This gives us ~139 years of IDs, 1024 workers, and 4096 IDs/ms/worker.
 */

const EPOCH = 1704067200000n; // 2024-01-01T00:00:00Z
const WORKER_BITS = 10n;
const SEQUENCE_BITS = 12n;
const MAX_WORKER = (1n << WORKER_BITS) - 1n;
const MAX_SEQUENCE = (1n << SEQUENCE_BITS) - 1n;
const WORKER_SHIFT = SEQUENCE_BITS;
const TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_BITS;

let workerId = BigInt(process.env.WORKER_ID || '1');
let sequence = 0n;
let lastTimestamp = -1n;

export function setWorkerId(id: number) {
  if (BigInt(id) > MAX_WORKER) throw new Error(`Worker ID must be <= ${MAX_WORKER}`);
  workerId = BigInt(id);
}

export function generateId(): string {
  let timestamp = BigInt(Date.now()) - EPOCH;

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & MAX_SEQUENCE;
    if (sequence === 0n) {
      // Wait for next millisecond
      while (timestamp <= lastTimestamp) {
        timestamp = BigInt(Date.now()) - EPOCH;
      }
    }
  } else {
    sequence = 0n;
  }

  lastTimestamp = timestamp;

  const id =
    (timestamp << TIMESTAMP_SHIFT) |
    (workerId << WORKER_SHIFT) |
    sequence;

  return id.toString();
}

export function extractTimestamp(id: string): Date {
  const snowflake = BigInt(id);
  const timestamp = (snowflake >> TIMESTAMP_SHIFT) + EPOCH;
  return new Date(Number(timestamp));
}

export function extractWorkerId(id: string): number {
  const snowflake = BigInt(id);
  return Number((snowflake >> WORKER_SHIFT) & MAX_WORKER);
}
