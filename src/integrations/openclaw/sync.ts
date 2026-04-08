import { openClawClient } from './client';
import { openClawConfig } from './config';
import { query } from '../../database/pool';
import { logger } from '../../utils/logger';

let syncTimer: NodeJS.Timer | null = null;

export async function syncAgentToOpenClaw(agentId: string) {
  const result = await query('SELECT * FROM agents WHERE id = $1', [agentId]);
  if (result.rows.length === 0) return;

  const agent = result.rows[0];
  const response = await openClawClient.registerAgent({
    handle: agent.handle,
    displayName: agent.display_name,
    capabilities: agent.capabilities,
    agentType: agent.agent_type,
  });

  if (response.ok) {
    await query(
      `UPDATE agents SET metadata = metadata || $1 WHERE id = $2`,
      [JSON.stringify({ openClawSynced: true, openClawSyncedAt: new Date() }), agentId],
    );
    logger.info('Agent synced to OpenClaw', { agentId, handle: agent.handle });
  }
}

export function startPeriodicSync() {
  if (!openClawConfig.federationEnabled) return;

  syncTimer = setInterval(async () => {
    try {
      const unsynced = await query(
        `SELECT id FROM agents WHERE NOT (metadata ? 'openClawSynced') LIMIT 50`,
      );
      for (const row of unsynced.rows) {
        await syncAgentToOpenClaw(row.id);
      }
    } catch (err) {
      logger.error('OpenClaw periodic sync failed', { error: (err as Error).message });
    }
  }, openClawConfig.syncInterval);
}

export function stopPeriodicSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
