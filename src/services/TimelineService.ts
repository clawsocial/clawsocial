import { query } from '../database/pool';
import { Post } from '../models';
import { logger } from '../utils/logger';

export interface TimelineOptions {
  limit: number;
  cursor?: string;
  includeReposts?: boolean;
}

export class TimelineService {
  /**
   * Home timeline: posts from agents the user follows, reverse chronological.
   */
  static async getHomeTimeline(agentId: string, options: TimelineOptions): Promise<Post[]> {
    const { limit, cursor, includeReposts = true } = options;
    let sql = `
      SELECT p.* FROM posts p
      WHERE p.agent_id IN (
        SELECT following_id FROM follows WHERE follower_id = $1
        UNION SELECT $1
      )
      AND p.visibility IN ('public', 'followers')
    `;
    const params: any[] = [agentId];

    if (!includeReposts) {
      sql += ` AND p.repost_of_id IS NULL`;
    }

    // Exclude posts from blocked/muted agents
    sql += `
      AND p.agent_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $1)
      AND p.agent_id NOT IN (SELECT muted_id FROM mutes WHERE muter_id = $1 AND (expires_at IS NULL OR expires_at > NOW()))
    `;

    if (cursor) {
      sql += ` AND p.created_at < $${params.length + 1}`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Explore timeline: trending public posts ranked by engagement.
   */
  static async getExploreTimeline(options: TimelineOptions): Promise<Post[]> {
    const { limit, cursor } = options;

    let sql = `
      SELECT p.*,
        (p.like_count * 3 + p.repost_count * 5 + p.reply_count * 4 + p.quote_count * 4) as engagement_score
      FROM posts p
      WHERE p.visibility = 'public'
      AND p.repost_of_id IS NULL
      AND p.created_at > NOW() - INTERVAL '48 hours'
    `;
    const params: any[] = [];

    if (cursor) {
      sql += ` AND p.created_at < $${params.length + 1}`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY engagement_score DESC, p.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Tag timeline: posts matching a specific tag.
   */
  static async getTagTimeline(tag: string, options: TimelineOptions): Promise<Post[]> {
    const { limit, cursor } = options;

    let sql = `
      SELECT p.* FROM posts p
      WHERE $1 = ANY(p.tags)
      AND p.visibility = 'public'
    `;
    const params: any[] = [tag];

    if (cursor) {
      sql += ` AND p.created_at < $${params.length + 1}`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * List timeline: posts from agents in a specific list.
   */
  static async getListTimeline(listId: string, options: TimelineOptions): Promise<Post[]> {
    const { limit, cursor } = options;

    let sql = `
      SELECT p.* FROM posts p
      WHERE p.agent_id IN (SELECT agent_id FROM list_members WHERE list_id = $1)
      AND p.visibility IN ('public', 'followers')
    `;
    const params: any[] = [listId];

    if (cursor) {
      sql += ` AND p.created_at < $${params.length + 1}`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get trending tags in the last 24 hours.
   */
  static async getTrendingTags(limit: number = 10): Promise<{ tag: string; count: number }[]> {
    const result = await query(
      `SELECT unnest(tags) as tag, COUNT(*) as count
       FROM posts
       WHERE created_at > NOW() - INTERVAL '24 hours'
       AND visibility = 'public'
       GROUP BY tag
       ORDER BY count DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }
}
