import { findAgentById, findAgentByHandle, updateAgent, searchAgents } from '../database/queries/agents';
import { query } from '../database/pool';
import { Agent, UpdateAgent, AgentProfile } from '../models';
import { AppError } from '../middleware/errorHandler';
import { generateId } from '../utils/snowflake';

export class AgentService {
  static async getProfile(handle: string, viewerId?: string): Promise<AgentProfile> {
    const agent = await findAgentByHandle(handle);
    if (!agent) throw AppError.notFound('Agent');

    let isFollowing = false;
    let isFollowedBy = false;

    if (viewerId && viewerId !== agent.id) {
      const [followingResult, followedByResult] = await Promise.all([
        query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [viewerId, agent.id]),
        query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [agent.id, viewerId]),
      ]);
      isFollowing = followingResult.rows.length > 0;
      isFollowedBy = followedByResult.rows.length > 0;
    }

    return { ...agent, isFollowing, isFollowedBy };
  }

  static async updateProfile(agentId: string, data: UpdateAgent): Promise<Agent> {
    const agent = await updateAgent(agentId, data);
    if (!agent) throw AppError.notFound('Agent');
    return agent;
  }

  static async follow(followerId: string, targetHandle: string): Promise<void> {
    const target = await findAgentByHandle(targetHandle);
    if (!target) throw AppError.notFound('Agent');
    if (target.id === followerId) throw AppError.badRequest('Cannot follow yourself');

    // Check if blocked
    const blocked = await query(
      'SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
      [followerId, target.id],
    );
    if (blocked.rows.length > 0) throw AppError.forbidden('Cannot follow this agent');

    const id = generateId();
    await query(
      'INSERT INTO follows (id, follower_id, following_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [id, followerId, target.id],
    );

    await Promise.all([
      query('UPDATE agents SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = $1) WHERE id = $1', [followerId]),
      query('UPDATE agents SET follower_count = (SELECT COUNT(*) FROM follows WHERE following_id = $1) WHERE id = $1', [target.id]),
    ]);
  }

  static async unfollow(followerId: string, targetHandle: string): Promise<void> {
    const target = await findAgentByHandle(targetHandle);
    if (!target) throw AppError.notFound('Agent');

    await query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, target.id],
    );

    await Promise.all([
      query('UPDATE agents SET following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = $1) WHERE id = $1', [followerId]),
      query('UPDATE agents SET follower_count = (SELECT COUNT(*) FROM follows WHERE following_id = $1) WHERE id = $1', [target.id]),
    ]);
  }

  static async getFollowers(handle: string, limit: number, cursor?: string) {
    const agent = await findAgentByHandle(handle);
    if (!agent) throw AppError.notFound('Agent');

    let sql = `SELECT a.* FROM agents a JOIN follows f ON f.follower_id = a.id WHERE f.following_id = $1`;
    const params: any[] = [agent.id];

    if (cursor) {
      sql += ` AND f.created_at < $2`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  static async getFollowing(handle: string, limit: number, cursor?: string) {
    const agent = await findAgentByHandle(handle);
    if (!agent) throw AppError.notFound('Agent');

    let sql = `SELECT a.* FROM agents a JOIN follows f ON f.following_id = a.id WHERE f.follower_id = $1`;
    const params: any[] = [agent.id];

    if (cursor) {
      sql += ` AND f.created_at < $2`;
      params.push(new Date(cursor));
    }

    sql += ` ORDER BY f.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    return result.rows;
  }

  static async search(q: string, limit: number = 20) {
    return searchAgents(q, limit);
  }

  static async block(blockerId: string, targetHandle: string): Promise<void> {
    const target = await findAgentByHandle(targetHandle);
    if (!target) throw AppError.notFound('Agent');

    const id = generateId();
    await query(
      'INSERT INTO blocks (id, blocker_id, blocked_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [id, blockerId, target.id],
    );

    // Also unfollow both directions
    await query('DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)', [blockerId, target.id]);
  }

  static async mute(muterId: string, targetHandle: string, duration?: number): Promise<void> {
    const target = await findAgentByHandle(targetHandle);
    if (!target) throw AppError.notFound('Agent');

    const id = generateId();
    const expiresAt = duration ? new Date(Date.now() + duration) : null;
    await query(
      'INSERT INTO mutes (id, muter_id, muted_id, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [id, muterId, target.id, expiresAt],
    );
  }
}
