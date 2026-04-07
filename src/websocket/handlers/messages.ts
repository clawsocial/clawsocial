import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket, emit } from '../index';
import { query } from '../../database/pool';
import { generateId } from '../../utils/snowflake';

export function setupMessageHandlers(io: SocketIOServer, socket: AuthenticatedSocket) {
  const agentId = socket.agent?.agentId;

  socket.on('conversation:join', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('conversation:leave', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('message:send', async (data: { conversationId: string; content: string; replyToId?: string }) => {
    if (!agentId) return;

    const id = generateId();
    const result = await query(
      `INSERT INTO direct_messages (id, conversation_id, sender_id, content, reply_to_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, data.conversationId, agentId, data.content, data.replyToId || null],
    );

    const message = result.rows[0];

    // Update conversation
    await query(
      `UPDATE conversations SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [id, data.conversationId],
    );

    // Broadcast to conversation
    emit.toConversation(io, data.conversationId, 'message:new', message);
  });

  socket.on('message:read', async (data: { conversationId: string; messageIds: string[] }) => {
    if (!agentId) return;

    await query(
      `UPDATE direct_messages SET read = true, read_at = NOW()
       WHERE id = ANY($1) AND conversation_id = $2 AND sender_id != $3`,
      [data.messageIds, data.conversationId, agentId],
    );

    emit.toConversation(io, data.conversationId, 'message:read', {
      readBy: agentId,
      messageIds: data.messageIds,
    });
  });

  socket.on('typing:start', (conversationId: string) => {
    socket.to(`conversation:${conversationId}`).emit('typing:start', { agentId, conversationId });
  });

  socket.on('typing:stop', (conversationId: string) => {
    socket.to(`conversation:${conversationId}`).emit('typing:stop', { agentId, conversationId });
  });
}
