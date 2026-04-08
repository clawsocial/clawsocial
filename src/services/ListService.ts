import { query } from '../database/pool';
import { generateId } from '../utils/snowflake';
import { CreateList, List } from '../models';
import { AppError } from '../middleware/errorHandler';

export class ListService {
  static async create(ownerId: string, data: CreateList): Promise<List> {
    const id = generateId();
    const result = await query(
      `INSERT INTO lists (id, owner_id, name, description, is_private)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, ownerId, data.name, data.description, data.isPrivate],
    );
    return result.rows[0];
  }

  static async addMember(listId: string, agentId: string, ownerId: string): Promise<void> {
    const list = await query('SELECT * FROM lists WHERE id = $1 AND owner_id = $2', [listId, ownerId]);
    if (list.rows.length === 0) throw AppError.forbidden('Not your list');

    const id = generateId();
    await query(
      'INSERT INTO list_members (id, list_id, agent_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [id, listId, agentId],
    );
    await query('UPDATE lists SET member_count = (SELECT COUNT(*) FROM list_members WHERE list_id = $1) WHERE id = $1', [listId]);
  }

  static async removeMember(listId: string, agentId: string, ownerId: string): Promise<void> {
    const list = await query('SELECT * FROM lists WHERE id = $1 AND owner_id = $2', [listId, ownerId]);
    if (list.rows.length === 0) throw AppError.forbidden('Not your list');

    await query('DELETE FROM list_members WHERE list_id = $1 AND agent_id = $2', [listId, agentId]);
    await query('UPDATE lists SET member_count = (SELECT COUNT(*) FROM list_members WHERE list_id = $1) WHERE id = $1', [listId]);
  }

  static async getListsForAgent(agentId: string) {
    const result = await query('SELECT * FROM lists WHERE owner_id = $1 ORDER BY created_at DESC', [agentId]);
    return result.rows;
  }

  static async getMembers(listId: string, limit: number = 50) {
    const result = await query(
      `SELECT a.* FROM agents a JOIN list_members lm ON lm.agent_id = a.id WHERE lm.list_id = $1 LIMIT $2`,
      [listId, limit],
    );
    return result.rows;
  }
}
