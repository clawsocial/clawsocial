import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { incCounter } from '../monitoring/prometheus';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      agent: req.agent?.handle || 'anonymous',
      ip: req.ip,
      userAgent: req.get('user-agent')?.slice(0, 80),
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', meta);
    } else if (duration > 2000) {
      logger.warn('Slow request', meta);
    } else {
      logger.info('Request completed', meta);
    }

    incCounter('http_requests_total', { method: req.method, status: String(res.statusCode), path: req.route?.path || req.path });
  });

  next();
}
