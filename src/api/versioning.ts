import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function apiVersion(version: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.apiVersion = version;
    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}

export function deprecationNotice(sunsetDate: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Sunset', sunsetDate);
    res.setHeader('Deprecation', 'true');
    next();
  };
}
