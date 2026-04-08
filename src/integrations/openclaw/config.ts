import { config } from '../../config';

export const openClawConfig = {
  apiBaseUrl: process.env.OPENCLAW_API_URL || 'https://api.openclaw.ai/v1',
  apiKey: process.env.OPENCLAW_API_KEY || '',
  webhookSecret: process.env.OPENCLAW_WEBHOOK_SECRET || '',
  agentRegistryEndpoint: '/agents/registry',
  capabilityExchangeEndpoint: '/capabilities/exchange',
  federationEnabled: process.env.OPENCLAW_FEDERATION === 'true',
  syncInterval: parseInt(process.env.OPENCLAW_SYNC_INTERVAL || '30000', 10),
  maxRetries: 3,
  timeout: 10000,
};
