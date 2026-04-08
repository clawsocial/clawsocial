import { describe, it, expect } from '@jest/globals';
import { parsePaginationParams, encodeCursor, decodeCursor } from '../../src/utils/pagination';

describe('Pagination', () => {
  describe('parsePaginationParams', () => {
    it('should use defaults', () => {
      const result = parsePaginationParams({});
      expect(result.limit).toBe(20);
      expect(result.cursor).toBeUndefined();
    });

    it('should cap limit at 100', () => {
      const result = parsePaginationParams({ limit: '500' });
      expect(result.limit).toBe(100);
    });

    it('should floor limit at 1', () => {
      const result = parsePaginationParams({ limit: '-5' });
      expect(result.limit).toBe(1);
    });
  });

  describe('cursor encoding', () => {
    it('should encode and decode cursor', () => {
      const id = 'test-id-123';
      const timestamp = new Date('2026-04-07T12:00:00Z');
      const cursor = encodeCursor(id, timestamp);
      const decoded = decodeCursor(cursor);
      expect(decoded).not.toBeNull();
      expect(decoded!.id).toBe(id);
      expect(decoded!.ts.toISOString()).toBe(timestamp.toISOString());
    });

    it('should return null for invalid cursor', () => {
      expect(decodeCursor('invalid')).toBeNull();
    });
  });
});
