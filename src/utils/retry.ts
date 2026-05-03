import { logger } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  shouldRetry?: (err: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 200,
    maxDelayMs = 5000,
    factor = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }
      logger.warn('Retrying after error', { attempt, error: lastError.message, delay });
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * factor, maxDelayMs);
    }
  }

  throw lastError;
}
