import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

const MIN_SIZE = 1024;

export function compression() {
  return (req: Request, res: Response, next: NextFunction) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip')) return next();

    const originalSend = res.send.bind(res);
    res.send = function (body: any) {
      if (typeof body === 'string' && body.length >= MIN_SIZE) {
        const compressed = zlib.gzipSync(body);
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Length', compressed.length);
        return originalSend(compressed);
      }
      return originalSend(body);
    };
    next();
  };
}
