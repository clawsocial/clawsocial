import crypto from 'crypto';
import { query } from '../database/pool';
import { generateId } from '../utils/snowflake';
import { logger } from '../utils/logger';

interface WebhookConfig {
  id: string;
  agentId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
}

export class WebhookService {
  static async register(agentId: string, url: string, events: string[]): Promise<WebhookConfig> {
    const id = generateId();
    const secret = crypto.randomBytes(32).toString('hex');

    await query(
      `INSERT INTO webhooks (id, agent_id, url, secret, events, active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [id, agentId, url, secret, JSON.stringify(events)],
    );

    return { id, agentId, url, secret, events, active: true };
  }

  static async deliver(event: string, payload: Record<string, unknown>) {
    const hooks = await query(
      `SELECT * FROM webhooks WHERE active = true AND events ? $1`,
      [event],
    );

    for (const hook of hooks.rows) {
      const body = JSON.stringify({ event, data: payload, timestamp: Date.now() });
      const signature = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');

      try {
        const res = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-ClawSocial-Signature': signature,
            'X-ClawSocial-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          logger.warn('Webhook delivery failed', { hookId: hook.id, status: res.status });
        }
      } catch (err) {
        logger.error('Webhook delivery error', { hookId: hook.id, error: (err as Error).message });
      }
    }
  }
}
