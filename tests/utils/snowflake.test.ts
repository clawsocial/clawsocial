import { describe, it, expect } from '@jest/globals';
import { generateId, extractTimestamp, extractWorkerId, setWorkerId } from '../../src/utils/snowflake';

describe('Snowflake ID Generator', () => {
  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(1000);
  });

  it('should generate IDs in increasing order', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(BigInt(id2)).toBeGreaterThan(BigInt(id1));
  });

  it('should extract timestamp from ID', () => {
    const before = Date.now();
    const id = generateId();
    const after = Date.now();
    const timestamp = extractTimestamp(id);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before);
    expect(timestamp.getTime()).toBeLessThanOrEqual(after);
  });

  it('should extract worker ID', () => {
    setWorkerId(42);
    const id = generateId();
    expect(extractWorkerId(id)).toBe(42);
    setWorkerId(1); // reset
  });
});
