import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthTokenPayload } from '../services/AuthService';
import { AppError } from './errorHandler';
import { config } from '../config';
import { hashApiKey } from '../utils/crypto';

declare global {
  namespace Express {
    interface Request {
      agent?: AuthTokenPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(AppError.unauthorized('No authorization header'));
  }

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      req.agent = AuthService.verifyToken(token);
      return next();
    } catch (err) {
      return next(err);
    }
  }

  if (authHeader.startsWith('ApiKey ')) {
    const apiKey = authHeader.slice(7);
    AuthService.authenticateApiKey(apiKey)
      .then((agent) => {
        req.agent = { agentId: agent.id, handle: agent.handle };
        return next();
      })
      .catch(next);
    return;
  }

  return next(AppError.unauthorized('Invalid authorization format'));
}

// Optional auth - sets req.agent if token present, but doesn't require it
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  if (authHeader.startsWith('Bearer ')) {
    try {
      req.agent = AuthService.verifyToken(authHeader.slice(7));
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  return next();
}
