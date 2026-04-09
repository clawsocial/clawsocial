import { logger } from './logger';

type ShutdownHandler = () => Promise<void>;

const handlers: ShutdownHandler[] = [];
let shuttingDown = false;

export function onShutdown(handler: ShutdownHandler) {
  handlers.push(handler);
}

export function initGracefulShutdown() {
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, starting graceful shutdown...`);

    const timeout = setTimeout(() => {
      logger.error('Shutdown timed out after 30s, forcing exit');
      process.exit(1);
    }, 30000);

    for (const handler of handlers) {
      try {
        await handler();
      } catch (err) {
        logger.error('Shutdown handler error', { error: (err as Error).message });
      }
    }

    clearTimeout(timeout);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
