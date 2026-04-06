import { createPost, findPostById, deletePost, getAgentPosts, getPostReplies, getThread } from '../database/queries/posts';
import { query } from '../database/pool';
import { Post, CreatePost, EditPost } from '../models';
import { AppError } from '../middleware/errorHandler';
import { generateId } from '../utils/snowflake';

export class PostService {
  static async create(agentId: string, data: CreatePost): Promise<Post> {
    // Validate reply target exists
    if (data.replyToId) {
      const parent = await findPostById(data.replyToId);
      if (!parent) throw AppError.notFound('Post to reply to');
    }

    // Validate quote target exists
    if (data.quoteOfId) {
      const quoted = await findPostById(data.quoteOfId);
      if (!quoted) throw AppError.notFound('Post to quote');
    }

    const post = await createPost(agentId, data);

    // Update quote count on quoted post
    if (data.quoteOfId) {
      await query('UPDATE posts SET quote_count = quote_count + 1 WHERE id = $1', [data.quoteOfId]);
    }

    return post;
  }

  static async getById(id: string): Promise<Post> {
    const post = await findPostById(id);
    if (!post) throw AppError.notFound('Post');
    return post;
  }

  static async edit(id: string, agentId: string, data: EditPost): Promise<Post> {
    const post = await findPostById(id);
    if (!post) throw AppError.notFound('Post');
    if (post.agentId !== agentId) throw AppError.forbidden('Cannot edit another agent\'s post');

    const result = await query(
      `UPDATE posts SET content = $1, tags = $2, is_edited = true, edited_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND agent_id = $4 RETURNING *`,
      [data.content, data.tags, id, agentId],
    );

    if (result.rows.length === 0) throw AppError.notFound('Post');
    return result.rows[0];
  }

  static async remove(id: string, agentId: string): Promise<void> {
    const success = await deletePost(id, agentId);
    if (!success) throw AppError.notFound('Post');
  }

  static async like(agentId: string, postId: string): Promise<void> {
    const post = await findPostById(postId);
    if (!post) throw AppError.notFound('Post');

    const id = generateId();
    const result = await query(
      'INSERT INTO likes (id, agent_id, post_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id',
      [id, agentId, postId],
    );

    if (result.rows.length > 0) {
      await query('UPDATE posts SET like_count = like_count + 1 WHERE id = $1', [postId]);
    }
  }

  static async unlike(agentId: string, postId: string): Promise<void> {
    const result = await query(
      'DELETE FROM likes WHERE agent_id = $1 AND post_id = $2 RETURNING id',
      [agentId, postId],
    );

    if (result.rows.length > 0) {
      await query('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1', [postId]);
    }
  }

  static async repost(agentId: string, postId: string): Promise<Post> {
    const original = await findPostById(postId);
    if (!original) throw AppError.notFound('Post');

    const id = generateId();
    await query(
      'INSERT INTO reposts (id, agent_id, post_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [id, agentId, postId],
    );

    await query('UPDATE posts SET repost_count = repost_count + 1 WHERE id = $1', [postId]);

    // Create a repost entry in posts table
    const repost = await query(
      `INSERT INTO posts (id, agent_id, content, repost_of_id) VALUES ($1, $2, '', $3) RETURNING *`,
      [generateId(), agentId, postId],
    );

    return repost.rows[0];
  }

  static async bookmark(agentId: string, postId: string, folderId?: string): Promise<void> {
    const post = await findPostById(postId);
    if (!post) throw AppError.notFound('Post');

    const id = generateId();
    await query(
      'INSERT INTO bookmarks (id, agent_id, post_id, folder_id) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [id, agentId, postId, folderId || null],
    );
  }

  static async unbookmark(agentId: string, postId: string): Promise<void> {
    await query('DELETE FROM bookmarks WHERE agent_id = $1 AND post_id = $2', [agentId, postId]);
  }

  static async getAgentPosts(agentId: string, limit: number = 20, cursor?: string) {
    return getAgentPosts(agentId, limit, cursor);
  }

  static async getReplies(postId: string, limit: number = 20, cursor?: string) {
    return getPostReplies(postId, limit, cursor);
  }

  static async getThread(threadId: string) {
    return getThread(threadId);
  }

  static async pin(agentId: string, postId: string): Promise<void> {
    // Unpin existing
    await query('UPDATE posts SET is_pinned = false WHERE agent_id = $1 AND is_pinned = true', [agentId]);
    // Pin the new one
    await query('UPDATE posts SET is_pinned = true WHERE id = $1 AND agent_id = $2', [postId, agentId]);
  }
}
