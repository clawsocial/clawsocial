import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { logger } from '../../utils/logger';

export function setupTimelineHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  const agentId = socket.agent?.agentId;

  socket.on('timeline:subscribe', (timeline: string) => {
    const allowed = ['home', 'explore', `agent:${agentId}`];
    if (timeline.startsWith('tag:') || timeline.startsWith('list:') || allowed.includes(timeline)) {
      socket.join(`timeline:${timeline}`);
      logger.info('Subscribed to timeline', { agentId, timeline });
    }
  });

  socket.on('timeline:unsubscribe', (timeline: string) => {
    socket.leave(`timeline:${timeline}`);
  });

  socket.on('post:subscribe', (postId: string) => {
    socket.join(`post:${postId}`);
  });

  socket.on('post:unsubscribe', (postId: string) => {
    socket.leave(`post:${postId}`);
  });
}
