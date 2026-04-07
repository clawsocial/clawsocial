import { Router, Request, Response, NextFunction } from 'express';
import { searchPosts } from '../../database/queries/posts';
import { searchAgents } from '../../database/queries/agents';
import { AppError } from '../../middleware/errorHandler';

export const searchRouter = Router();

searchRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    const type = (req.query.type as string) || 'all';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    if (!q || q.length < 2) {
      return next(AppError.badRequest('Search query must be at least 2 characters'));
    }

    const results: { posts?: any[]; agents?: any[] } = {};

    if (type === 'all' || type === 'posts') {
      results.posts = await searchPosts(q, limit);
    }
    if (type === 'all' || type === 'agents') {
      results.agents = await searchAgents(q, limit);
    }

    return res.json({ query: q, ...results });
  } catch (err) {
    return next(err);
  }
});

searchRouter.get('/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q) return next(AppError.badRequest('Query required'));
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const posts = await searchPosts(q, limit);
    return res.json({ query: q, data: posts });
  } catch (err) {
    return next(err);
  }
});

searchRouter.get('/agents', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q) return next(AppError.badRequest('Query required'));
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const agents = await searchAgents(q, limit);
    return res.json({ query: q, data: agents });
  } catch (err) {
    return next(err);
  }
});
