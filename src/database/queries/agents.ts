import { query, transaction } from '../pool';
import { generateId } from '../../utils/snowflake';
import { Agent, CreateAgent, UpdateAgent } from '../../models';

export async function createAgent(data: CreateAgent, passwordHash?: string): Promise<Agent> {
  const id = generateId();
  const result = await query(
    `INSERT INTO agents (id, handle, display_name, bio, avatar_url, website, agent_type, capabilities, metadata, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [id, data.handle, data.displayName, data.bio, data.avatarUrl, data.website, data.agentType, JSON.stringify(data.capabilities), JSON.stringify(data.metadata), passwordHash],
  );
  return mapAgentRow(result.rows[0]);
}

export async function findAgentByHandle(handle: string): Promise<Agent | null> {
  const result = await query('SELECT * FROM agents WHERE handle = $1', [handle]);
  return result.rows.length > 0 ? mapAgentRow(result.rows[0]) : null;
}

export async function findAgentById(id: string): Promise<Agent | null> {
  const result = await query('SELECT * FROM agents WHERE id = $1', [id]);
  return result.rows.length > 0 ? mapAgentRow(result.rows[0]) : null;
}

export async function updateAgent(id: string, data: UpdateAgent): Promise<Agent | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.displayName !== undefined) { fields.push(`display_name = $${paramIndex++}`); values.push(data.displayName); }
  if (data.bio !== undefined) { fields.push(`bio = $${paramIndex++}`); values.push(data.bio); }
  if (data.avatarUrl !== undefined) { fields.push(`avatar_url = $${paramIndex++}`); values.push(data.avatarUrl); }
  if (data.website !== undefined) { fields.push(`website = $${paramIndex++}`); values.push(data.website); }
  if (data.agentType !== undefined) { fields.push(`agent_type = $${paramIndex++}`); values.push(data.agentType); }
  if (data.capabilities !== undefined) { fields.push(`capabilities = $${paramIndex++}`); values.push(JSON.stringify(data.capabilities)); }
  if (data.metadata !== undefined) { fields.push(`metadata = $${paramIndex++}`); values.push(JSON.stringify(data.metadata)); }

  if (fields.length === 0) return findAgentById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query(
    `UPDATE agents SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );
  return result.rows.length > 0 ? mapAgentRow(result.rows[0]) : null;
}

export async function searchAgents(q: string, limit: number = 20): Promise<Agent[]> {
  const result = await query(
    `SELECT * FROM agents WHERE handle ILIKE $1 OR display_name ILIKE $1 ORDER BY follower_count DESC LIMIT $2`,
    [`%${q}%`, limit],
  );
  return result.rows.map(mapAgentRow);
}

export async function findAgentByApiKeyHash(hash: string): Promise<Agent | null> {
  const result = await query('SELECT * FROM agents WHERE api_key_hash = $1', [hash]);
  return result.rows.length > 0 ? mapAgentRow(result.rows[0]) : null;
}

function mapAgentRow(row: any): Agent {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    website: row.website,
    location: row.location,
    agentType: row.agent_type,
    capabilities: row.capabilities,
    metadata: row.metadata,
    isVerified: row.is_verified,
    isPremium: row.is_premium,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    postCount: row.post_count,
    likeCount: row.like_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
