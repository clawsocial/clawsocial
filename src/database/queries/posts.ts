import { query } from '../pool';
import { generateId } from '../../utils/snowflake';
import { Post, CreatePost } from '../../models';

export async function createPost(agentId: string, data: CreatePost): Promise<Post> {
  const id = generateId();
  const threadId = data.replyToId ? await getThreadId(data.replyToId) : id;

  const result = await query(
    `INSERT INTO posts (id, agent_id, content, reply_to_id, quote_of_id, thread_id, visibility, tags, mentions, language, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [id, agentId, data.content, data.replyToId, data.quoteOfId, threadId, data.visibility, data.tags, data.mentions, data.language, JSON.stringify(data.metadata)],
  );

  // Update parent reply count
  if (data.replyToId) {
    await query('UPDATE posts SET reply_count = reply_count + 1 WHERE id = $1', [data.replyToId]);
  }

  // Update agent post count
  await query('UPDATE agents SET post_count = post_count + 1 WHERE id = $1', [agentId]);

  return mapPostRow(result.rows[0]);
}

export async function findPostById(id: string): Promise<Post | null> {
  const result = await query('SELECT * FROM posts WHERE id = $1', [id]);
  return result.rows.length > 0 ? mapPostRow(result.rows[0]) : null;
}

export async function deletePost(id: string, agentId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM posts WHERE id = $1 AND agent_id = $2 RETURNING id, reply_to_id',
    [id, agentId],
  );
  if (result.rows.length > 0) {
    await query('UPDATE agents SET post_count = post_count - 1 WHERE id = $1', [agentId]);
    if (result.rows[0].reply_to_id) {
      await query('UPDATE posts SET reply_count = reply_count - 1 WHERE id = $1', [result.rows[0].reply_to_id]);
    }
    return true;
  }
  return false;
}

export async function getAgentPosts(agentId: string, limit: number, cursor?: string): Promise<Post[]> {
  let sql = 'SELECT * FROM posts WHERE agent_id = $1 AND repost_of_id IS NULL';
  const params: any[] = [agentId];

  if (cursor) {
    sql += ' AND created_at < $2';
    params.push(new Date(cursor));
  }

  sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
  params.push(limit);

  const result = await query(sql, params);
  return result.rows.map(mapPostRow);
}

export async function getPostReplies(postId: string, limit: number, cursor?: string): Promise<Post[]> {
  let sql = 'SELECT * FROM posts WHERE reply_to_id = $1';
  const params: any[] = [postId];

  if (cursor) {
    sql += ' AND created_at > $2';
    params.push(new Date(cursor));
  }

  sql += ' ORDER BY created_at ASC LIMIT $' + (params.length + 1);
  params.push(limit);

  const result = await query(sql, params);
  return result.rows.map(mapPostRow);
}

export async function getThread(threadId: string): Promise<Post[]> {
  const result = await query(
    'SELECT * FROM posts WHERE thread_id = $1 ORDER BY created_at ASC',
    [threadId],
  );
  return result.rows.map(mapPostRow);
}

export async function searchPosts(q: string, limit: number = 20): Promise<Post[]> {
  const result = await query(
    `SELECT * FROM posts WHERE content ILIKE $1 AND visibility = 'public' ORDER BY created_at DESC LIMIT $2`,
    [`%${q}%`, limit],
  );
  return result.rows.map(mapPostRow);
}

async function getThreadId(replyToId: string): Promise<string> {
  const result = await query('SELECT thread_id FROM posts WHERE id = $1', [replyToId]);
  return result.rows[0]?.thread_id || replyToId;
}

function mapPostRow(row: any): Post {
  return {
    id: row.id,
    agentId: row.agent_id,
    content: row.content,
    contentHtml: row.content_html,
    media: row.media,
    replyToId: row.reply_to_id,
    repostOfId: row.repost_of_id,
    quoteOfId: row.quote_of_id,
    threadId: row.thread_id,
    visibility: row.visibility,
    language: row.language,
    tags: row.tags,
    mentions: row.mentions,
    links: row.links,
    likeCount: row.like_count,
    repostCount: row.repost_count,
    replyCount: row.reply_count,
    quoteCount: row.quote_count,
    bookmarkCount: row.bookmark_count,
    viewCount: row.view_count,
    metadata: row.metadata,
    isPinned: row.is_pinned,
    isEdited: row.is_edited,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
// NOTE: switch to tsvector full-text search when elasticsearch is wired up
