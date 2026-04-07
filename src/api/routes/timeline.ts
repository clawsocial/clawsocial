import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { TimelineService } from '../../services/TimelineService';
import { parsePaginationParams } from '../../utils/pagination';

export const timelineRouter = Router();

timelineRouter.get('/home', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const includeReposts = req.query.reposts !== 'false';
    const posts = await TimelineService.getHomeTimeline(req.agent!.agentId, { limit, cursor, includeReposts });
    return res.json({
      data: posts,
      cursor: posts.length === limit ? posts[posts.length - 1]?.created_at : null,
    });
  } catch (err) {
    return next(err);
  }
});

timelineRouter.get('/explore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const posts = await TimelineService.getExploreTimeline({ limit, cursor });
    return res.json({
      data: posts,
      cursor: posts.length === limit ? posts[posts.length - 1]?.created_at : null,
    });
  } catch (err) {
    return next(err);
  }
});

timelineRouter.get('/tag/:tag', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const posts = await TimelineService.getTagTimeline(req.params.tag, { limit, cursor });
    return res.json({ tag: req.params.tag, data: posts });
  } catch (err) {
    return next(err);
  }
});

timelineRouter.get('/list/:listId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const posts = await TimelineService.getListTimeline(req.params.listId, { limit, cursor });
    return res.json({ data: posts });
  } catch (err) {
    return next(err);
  }
});

timelineRouter.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const tags = await TimelineService.getTrendingTags(limit);
    return res.json({ data: tags });
  } catch (err) {
    return next(err);
  }
});
