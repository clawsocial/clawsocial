import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthService, AuthTokenPayload } from '../services/AuthService';
import { logger } from '../utils/logger';
import { setupTimelineHandlers } from './handlers/timeline';
import { setupNotificationHandlers } from './handlers/notifications';
import { setupMessageHandlers } from './handlers/messages';
import { setupPresenceHandlers } from './handlers/presence';

export interface AuthenticatedSocket extends Socket {
  agent?: AuthTokenPayload;
}

export function setupWebSocket(io: SocketIOServer) {
  // Auth middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      socket.agent = AuthService.verifyToken(token);
      return next();
    } catch {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const agentId = socket.agent?.agentId;
    if (!agentId) return socket.disconnect();

    logger.info('WebSocket connected', { agentId });

    // Join personal room
    socket.join(`agent:${agentId}`);

    // Setup handlers
    setupTimelineHandlers(io, socket);
    setupNotificationHandlers(io, socket);
    setupMessageHandlers(io, socket);
    setupPresenceHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info('WebSocket disconnected', { agentId });
    });
  });

  return io;
}

// Emit helpers
export const emit = {
  toAgent(io: SocketIOServer, agentId: string, event: string, data: unknown) {
    io.to(`agent:${agentId}`).emit(event, data);
  },
  toTimeline(io: SocketIOServer, timeline: string, event: string, data: unknown) {
    io.to(`timeline:${timeline}`).emit(event, data);
  },
  toPost(io: SocketIOServer, postId: string, event: string, data: unknown) {
    io.to(`post:${postId}`).emit(event, data);
  },
  toConversation(io: SocketIOServer, conversationId: string, event: string, data: unknown) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  },
};
