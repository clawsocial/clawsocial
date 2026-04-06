import { query } from '../database/pool';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface ModerationAction {
  type: 'warn' | 'mute' | 'suspend' | 'delete_post' | 'delete_media';
  targetId: string;
  reason: string;
  moderatorId: string;
  duration?: number;
}

export class ModerationService {
  static async takeAction(action: ModerationAction): Promise<void> {
    logger.info('Moderation action', action);

    switch (action.type) {
      case 'delete_post':
        await query('DELETE FROM posts WHERE id = $1', [action.targetId]);
        break;

      case 'suspend':
        await query(
          `UPDATE agents SET metadata = metadata || $1 WHERE id = $2`,
          [JSON.stringify({ suspended: true, suspendedAt: new Date(), suspendedReason: action.reason }), action.targetId],
        );
        break;

      case 'warn':
        // Create a system notification
        await query(
          `INSERT INTO notifications (id, agent_id, type, from_agent_id, group_key)
           VALUES ($1, $2, 'system', $3, $4)`,
          [Date.now().toString(), action.targetId, action.moderatorId, `warn:${action.targetId}`],
        );
        break;
    }
  }

  static async getReports(limit: number = 50): Promise<any[]> {
    // Placeholder for report system
    return [];
  }

  static async checkContent(content: string): Promise<{ flagged: boolean; reason?: string }> {
    // Basic content moderation checks
    const bannedPatterns = [
      /\b(spam|scam)\b/i,
    ];

    for (const pattern of bannedPatterns) {
      if (pattern.test(content)) {
        return { flagged: true, reason: 'Content matched moderation filter' };
      }
    }

    return { flagged: false };
  }
}
