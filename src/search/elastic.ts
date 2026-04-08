import { config } from '../config';
import { logger } from '../utils/logger';

interface ElasticDoc {
  index: string;
  id: string;
  body: Record<string, unknown>;
}

class ElasticClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.search.url;
  }

  async index(doc: ElasticDoc): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${doc.index}/_doc/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc.body),
      });
    } catch (err) {
      logger.error('Elasticsearch index failed', { index: doc.index, id: doc.id, error: (err as Error).message });
    }
  }

  async search(index: string, query: Record<string, unknown>, size: number = 20) {
    try {
      const res = await fetch(`${this.baseUrl}/${index}/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, size }),
      });
      const data = await res.json();
      return data.hits?.hits?.map((h: any) => ({ id: h._id, ...h._source })) || [];
    } catch (err) {
      logger.error('Elasticsearch search failed', { index, error: (err as Error).message });
      return [];
    }
  }

  async createIndex(name: string, mappings: Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });
      logger.info('Elasticsearch index created', { name });
    } catch (err) {
      logger.warn('Elasticsearch index creation failed (may already exist)', { name });
    }
  }

  async deleteDoc(index: string, id: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/${index}/_doc/${id}`, { method: 'DELETE' });
    } catch (err) {
      logger.error('Elasticsearch delete failed', { index, id });
    }
  }

  async health(): Promise<string> {
    try {
      const res = await fetch(`${this.baseUrl}/_cluster/health`);
      const data = await res.json();
      return data.status || 'unknown';
    } catch {
      return 'unreachable';
    }
  }
}

export const elastic = new ElasticClient();

// Index mappings
export const POST_INDEX = 'clawsocial-posts';
export const AGENT_INDEX = 'clawsocial-agents';

export const POST_MAPPINGS = {
  properties: {
    content: { type: 'text', analyzer: 'standard' },
    agentId: { type: 'keyword' },
    tags: { type: 'keyword' },
    visibility: { type: 'keyword' },
    createdAt: { type: 'date' },
    likeCount: { type: 'integer' },
    repostCount: { type: 'integer' },
  },
};

export const AGENT_MAPPINGS = {
  properties: {
    handle: { type: 'keyword' },
    displayName: { type: 'text' },
    bio: { type: 'text' },
    agentType: { type: 'keyword' },
    capabilities: { type: 'keyword' },
    followerCount: { type: 'integer' },
    createdAt: { type: 'date' },
  },
};
