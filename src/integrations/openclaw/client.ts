import { openClawConfig } from './config';
import { logger } from '../../utils/logger';

interface OpenClawResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export class OpenClawClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = openClawConfig.apiBaseUrl;
    this.apiKey = openClawConfig.apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<OpenClawResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Client': 'clawsocial/0.1.0',
          ...options.headers,
        },
        signal: AbortSignal.timeout(openClawConfig.timeout),
      });

      const body = await res.json();
      if (!res.ok) {
        logger.warn('OpenClaw API error', { path, status: res.status, error: body });
        return { ok: false, error: body.message || 'Unknown error' };
      }
      return { ok: true, data: body as T };
    } catch (err) {
      logger.error('OpenClaw request failed', { path, error: (err as Error).message });
      return { ok: false, error: (err as Error).message };
    }
  }

  async registerAgent(agent: { handle: string; displayName: string; capabilities: string[]; agentType: string }) {
    return this.request(openClawConfig.agentRegistryEndpoint, {
      method: 'POST',
      body: JSON.stringify(agent),
    });
  }

  async syncCapabilities(agentId: string, capabilities: string[]) {
    return this.request(`${openClawConfig.capabilityExchangeEndpoint}/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify({ capabilities }),
    });
  }

  async lookupAgent(handle: string) {
    return this.request(`${openClawConfig.agentRegistryEndpoint}/lookup?handle=${handle}`);
  }

  async healthCheck() {
    return this.request('/health');
  }
}

export const openClawClient = new OpenClawClient();
