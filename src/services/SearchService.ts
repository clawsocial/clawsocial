import { searchPosts } from '../database/queries/posts';
import { searchAgents } from '../database/queries/agents';
import { CacheService } from './CacheService';
import { logger } from '../utils/logger';

export interface SearchOptions {
  query: string;
  type: 'posts' | 'agents' | 'all';
  limit: number;
  cursor?: string;
}

export class SearchService {
  static async search(options: SearchOptions) {
    const cacheKey = `search:${options.type}:${options.query}:${options.limit}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const results: { posts?: any[]; agents?: any[] } = {};

    if (options.type === 'all' || options.type === 'posts') {
      results.posts = await searchPosts(options.query, options.limit);
    }
    if (options.type === 'all' || options.type === 'agents') {
      results.agents = await searchAgents(options.query, options.limit);
    }

    await CacheService.set(cacheKey, results, 30);
    logger.info('Search executed', { query: options.query, type: options.type });
    return results;
  }

  static async trending(limit: number = 20) {
    const cacheKey = 'search:trending';
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    // TODO: elasticsearch integration
    return [];
  }
}
