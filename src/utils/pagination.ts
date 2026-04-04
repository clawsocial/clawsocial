export interface PaginationParams {
  cursor?: string;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  cursor: string | null;
  hasMore: boolean;
}

export function parsePaginationParams(query: {
  cursor?: string;
  limit?: string;
}): PaginationParams {
  return {
    cursor: query.cursor,
    limit: Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100),
  };
}

export function encodeCursor(id: string, timestamp: Date): string {
  const payload = JSON.stringify({ id, ts: timestamp.toISOString() });
  return Buffer.from(payload).toString('base64url');
}

export function decodeCursor(cursor: string): { id: string; ts: Date } | null {
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString());
    return { id: payload.id, ts: new Date(payload.ts) };
  } catch {
    return null;
  }
}
