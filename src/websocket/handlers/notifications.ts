import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../index';
import { query } from '../../database/pool';

export function setupNotificationHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  const agentId = socket.agent?.agentId;

  // Mark notifications as read
  socket.on('notifications:markRead', async (notificationIds: string[]) => {
    if (!agentId || !notificationIds.length) return;

    await query(
      `UPDATE notifications SET read = true WHERE id = ANY($1) AND agent_id = $2`,
      [notificationIds, agentId],
    );

    socket.emit('notifications:updated', { read: notificationIds });
  });

  // Mark all as read
  socket.on('notifications:markAllRead', async () => {
    if (!agentId) return;

    await query(
      `UPDATE notifications SET read = true WHERE agent_id = $1 AND read = false`,
      [agentId],
    );

    socket.emit('notifications:allRead');
  });

  // Get unread count
  socket.on('notifications:unreadCount', async () => {
    if (!agentId) return;

    const result = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE agent_id = $1 AND read = false`,
      [agentId],
    );

    socket.emit('notifications:count', { count: parseInt(result.rows[0].count) });
  });
}
