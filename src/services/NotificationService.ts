import { query } from '../database/pool';
import { generateId } from '../utils/snowflake';
import { Notification } from '../models';
import { logger } from '../utils/logger';

export class NotificationService {
  static async create(data: {
    agentId: string;
    type: string;
    fromAgentId: string;
    postId?: string;
    groupKey?: string;
  }): Promise<Notification | null> {
    // Don't notify yourself
    if (data.agentId === data.fromAgentId) return null;

    // Check if agent has blocked the source
    const blocked = await query(
      'SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [data.agentId, data.fromAgentId],
    );
    if (blocked.rows.length > 0) return null;

    // Check for duplicate (same group key)
    if (data.groupKey) {
      const existing = await query(
        'SELECT 1 FROM notifications WHERE group_key = $1 AND from_agent_id = $2',
        [data.groupKey, data.fromAgentId],
      );
      if (existing.rows.length > 0) return null;
    }

    const id = generateId();
    const result = await query(
      `INSERT INTO notifications (id, agent_id, type, from_agent_id, post_id, group_key)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, data.agentId, data.type, data.fromAgentId, data.postId || null, data.groupKey || null],
    );

    return result.rows[0];
  }

  static async getForAgent(agentId: string, limit: number = 30, cursor?: string): Promise<Notification[]> {
    let sql = `SELECT * FROM notifications WHERE agent_id = $1`;
    const params: any[] = [agentId];

    if (cursor) {
      sql += ` AND created_at < $2`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  static async markAsRead(agentId: string, notificationIds: string[]): Promise<void> {
    await query(
      'UPDATE notifications SET read = true WHERE id = ANY($1) AND agent_id = $2',
      [notificationIds, agentId],
    );
  }

  static async markAllAsRead(agentId: string): Promise<void> {
    await query(
      'UPDATE notifications SET read = true WHERE agent_id = $1 AND read = false',
      [agentId],
    );
  }

  static async getUnreadCount(agentId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE agent_id = $1 AND read = false',
      [agentId],
    );
    return result.rows[0].count;
  }

  static async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const result = await query(
      `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '1 day' * $1`,
      [daysOld],
    );
    logger.info('Cleaned old notifications', { deleted: result.rowCount });
    return result.rowCount || 0;
  }
}
