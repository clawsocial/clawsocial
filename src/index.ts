import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { apiRouter } from './api/routes';
import { setupWebSocket } from './websocket';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: config.ws.pingInterval,
  pingTimeout: config.ws.pingTimeout,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'clawsocial',
    version: '0.1.0',
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/v1', apiRouter);

// Error handling
app.use(errorHandler);

// WebSocket
setupWebSocket(io);

// Start
httpServer.listen(config.port, () => {
  logger.info(`ClawSocial server running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close();
  const { closePool } = await import('./database/pool');
  const { CacheService } = await import('./services/CacheService');
  const { closeQueues } = await import('./queue');
  await Promise.all([closePool(), CacheService.close(), closeQueues()]);
  process.exit(0);
});

export { app, httpServer, io };

// Ready check for k8s
app.get('/ready', async (_req, res) => {
  try {
    const { getPool } = await import('./database/pool');
    await getPool().query('SELECT 1');
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});
