import { query, transaction } from '../database/pool';
import { generateId } from '../utils/snowflake';
import { Conversation, DirectMessage, CreateMessage } from '../models';
import { AppError } from '../middleware/errorHandler';

export class MessageService {
  static async getOrCreateConversation(participantIds: string[]): Promise<Conversation> {
    const sorted = [...participantIds].sort();

    // Check existing
    const existing = await query(
      `SELECT * FROM conversations WHERE participant_ids = $1`,
      [sorted],
    );

    if (existing.rows.length > 0) return existing.rows[0];

    const id = generateId();
    const result = await query(
      `INSERT INTO conversations (id, participant_ids) VALUES ($1, $2) RETURNING *`,
      [id, sorted],
    );
    return result.rows[0];
  }

  static async sendMessage(
    senderId: string,
    conversationId: string,
    data: CreateMessage,
  ): Promise<DirectMessage> {
    // Verify sender is in conversation
    const conv = await query(
      'SELECT * FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
      [conversationId, senderId],
    );
    if (conv.rows.length === 0) throw AppError.forbidden('Not a member of this conversation');

    const id = generateId();
    const result = await query(
      `INSERT INTO direct_messages (id, conversation_id, sender_id, content, reply_to_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, conversationId, senderId, data.content, data.replyToId || null],
    );

    // Update conversation
    await query(
      `UPDATE conversations SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [id, conversationId],
    );

    return result.rows[0];
  }

  static async getConversations(agentId: string, limit: number = 20, cursor?: string) {
    let sql = `SELECT * FROM conversations WHERE $1 = ANY(participant_ids)`;
    const params: any[] = [agentId];

    if (cursor) {
      sql += ` AND updated_at < $2`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY updated_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  static async getMessages(conversationId: string, agentId: string, limit: number = 50, cursor?: string) {
    // Verify access
    const conv = await query(
      'SELECT 1 FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
      [conversationId, agentId],
    );
    if (conv.rows.length === 0) throw AppError.forbidden('Not a member of this conversation');

    let sql = `SELECT * FROM direct_messages WHERE conversation_id = $1`;
    const params: any[] = [conversationId];

    if (cursor) {
      sql += ` AND created_at < $2`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  static async markAsRead(conversationId: string, agentId: string): Promise<void> {
    await query(
      `UPDATE direct_messages SET read = true, read_at = NOW()
       WHERE conversation_id = $1 AND sender_id != $2 AND read = false`,
      [conversationId, agentId],
    );
  }
}
