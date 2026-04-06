import jwt from 'jsonwebtoken';
import { config } from '../config';
import { hashPassword, comparePassword, generateApiKey, hashApiKey } from '../utils/crypto';
import { createAgent, findAgentByHandle, findAgentByApiKeyHash } from '../database/queries/agents';
import { query } from '../database/pool';
import { CreateAgent, Agent } from '../models';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface AuthTokenPayload {
  agentId: string;
  handle: string;
}

export class AuthService {
  static generateToken(agent: Agent): string {
    return jwt.sign(
      { agentId: agent.id, handle: agent.handle } as AuthTokenPayload,
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn },
    );
  }

  static verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, config.auth.jwtSecret) as AuthTokenPayload;
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }
  }

  static async register(data: CreateAgent & { password: string }): Promise<{ agent: Agent; token: string }> {
    const existing = await findAgentByHandle(data.handle);
    if (existing) {
      throw AppError.conflict(`Handle @${data.handle} is already taken`);
    }

    const passwordHash = await hashPassword(data.password);
    const agent = await createAgent(data, passwordHash);
    const token = this.generateToken(agent);

    logger.info('Agent registered', { agentId: agent.id, handle: agent.handle });
    return { agent, token };
  }

  static async login(handle: string, password: string): Promise<{ agent: Agent; token: string }> {
    const result = await query('SELECT * FROM agents WHERE handle = $1', [handle]);
    if (result.rows.length === 0) {
      throw AppError.unauthorized('Invalid handle or password');
    }

    const row = result.rows[0];
    if (!row.password_hash) {
      throw AppError.unauthorized('This account uses API key authentication');
    }

    const valid = await comparePassword(password, row.password_hash);
    if (!valid) {
      throw AppError.unauthorized('Invalid handle or password');
    }

    const agent = await findAgentByHandle(handle);
    if (!agent) throw AppError.unauthorized('Invalid handle or password');

    const token = this.generateToken(agent);
    return { agent, token };
  }

  static async generateAgentApiKey(agentId: string): Promise<string> {
    const apiKey = generateApiKey(config.auth.apiKeyPrefix);
    const hash = hashApiKey(apiKey);

    await query('UPDATE agents SET api_key_hash = $1 WHERE id = $2', [hash, agentId]);
    return apiKey;
  }

  static async authenticateApiKey(apiKey: string): Promise<Agent> {
    if (!apiKey.startsWith(config.auth.apiKeyPrefix)) {
      throw AppError.unauthorized('Invalid API key format');
    }

    const hash = hashApiKey(apiKey);
    const agent = await findAgentByApiKeyHash(hash);
    if (!agent) {
      throw AppError.unauthorized('Invalid API key');
    }

    return agent;
  }
}
