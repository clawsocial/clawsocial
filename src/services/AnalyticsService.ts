import { query } from '../database/pool';
import { CacheService } from './CacheService';
import { logger } from '../utils/logger';

export interface PlatformStats {
  totalAgents: number;
  totalPosts: number;
  activeAgents24h: number;
  postsToday: number;
  topTags: { tag: string; count: number }[];
}

export interface AgentAnalytics {
  agentId: string;
  totalPosts: number;
  totalLikes: number;
  totalFollowers: number;
  engagementRate: number;
  topPosts: any[];
  growthFollowers7d: number;
}

export class AnalyticsService {
  static async getPlatformStats(): Promise<PlatformStats> {
    const cached = await CacheService.get<PlatformStats>('analytics:platform');
    if (cached) return cached;

    const [agents, posts, active, today, tags] = await Promise.all([
      query('SELECT COUNT(*)::int as count FROM agents'),
      query('SELECT COUNT(*)::int as count FROM posts'),
      query(`SELECT COUNT(DISTINCT agent_id)::int as count FROM posts WHERE created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*)::int as count FROM posts WHERE created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT unnest(tags) as tag, COUNT(*)::int as count FROM posts WHERE created_at > NOW() - INTERVAL '24 hours' AND visibility = 'public' GROUP BY tag ORDER BY count DESC LIMIT 10`),
    ]);

    const stats: PlatformStats = {
      totalAgents: agents.rows[0].count,
      totalPosts: posts.rows[0].count,
      activeAgents24h: active.rows[0].count,
      postsToday: today.rows[0].count,
      topTags: tags.rows,
    };

    await CacheService.set('analytics:platform', stats, 300);
    return stats;
  }

  static async getAgentAnalytics(agentId: string): Promise<AgentAnalytics> {
    const [posts, likes, followers, growth, topPosts] = await Promise.all([
      query('SELECT COUNT(*)::int as count FROM posts WHERE agent_id = $1', [agentId]),
      query('SELECT COALESCE(SUM(like_count), 0)::int as total FROM posts WHERE agent_id = $1', [agentId]),
      query('SELECT COUNT(*)::int as count FROM follows WHERE following_id = $1', [agentId]),
      query(`SELECT COUNT(*)::int as count FROM follows WHERE following_id = $1 AND created_at > NOW() - INTERVAL '7 days'`, [agentId]),
      query('SELECT * FROM posts WHERE agent_id = $1 ORDER BY like_count DESC LIMIT 5', [agentId]),
    ]);

    const totalPosts = posts.rows[0].count;
    const totalLikes = likes.rows[0].total;
    const totalFollowers = followers.rows[0].count;

    return {
      agentId,
      totalPosts,
      totalLikes,
      totalFollowers,
      engagementRate: totalPosts > 0 ? totalLikes / totalPosts : 0,
      topPosts: topPosts.rows,
      growthFollowers7d: growth.rows[0].count,
    };
  }
}
