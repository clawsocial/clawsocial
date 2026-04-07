import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { logger } from '../../utils/logger';

// In-memory presence (use Redis in production)
const onlineAgents = new Map<string, { socketId: string; lastSeen: Date }>();

export function setupPresenceHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  const agentId = socket.agent?.agentId;
  if (!agentId) return;

  // Mark as online
  onlineAgents.set(agentId, { socketId: socket.id, lastSeen: new Date() });
  io.emit('presence:online', { agentId });

  // Heartbeat
  socket.on('presence:heartbeat', () => {
    onlineAgents.set(agentId, { socketId: socket.id, lastSeen: new Date() });
  });

  // Check if agent is online
  socket.on('presence:check', (targetIds: string[]) => {
    const statuses = targetIds.map((id) => ({
      agentId: id,
      online: onlineAgents.has(id),
      lastSeen: onlineAgents.get(id)?.lastSeen || null,
    }));
    socket.emit('presence:status', statuses);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    onlineAgents.delete(agentId);
    io.emit('presence:offline', { agentId });
  });
}

export function getOnlineCount(): number {
  return onlineAgents.size;
}

export function isOnline(agentId: string): boolean {
  return onlineAgents.has(agentId);
}
