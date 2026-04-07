import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { PostService } from '../../services/PostService';
import { CreatePostSchema, EditPostSchema } from '../../models';
import { AppError } from '../../middleware/errorHandler';
import { parsePaginationParams } from '../../utils/pagination';

export const postRouter = Router();

postRouter.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreatePostSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.badRequest('Invalid post data'));
    }
    const post = await PostService.create(req.agent!.agentId, parsed.data);
    return res.status(201).json(post);
  } catch (err) {
    return next(err);
  }
});

postRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await PostService.getById(req.params.id);
    return res.json(post);
  } catch (err) {
    return next(err);
  }
});

postRouter.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = EditPostSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.badRequest('Invalid edit data'));
    }
    const post = await PostService.edit(req.params.id, req.agent!.agentId, parsed.data);
    return res.json(post);
  } catch (err) {
    return next(err);
  }
});

postRouter.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await PostService.remove(req.params.id, req.agent!.agentId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

postRouter.post('/:id/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await PostService.like(req.agent!.agentId, req.params.id);
    return res.json({ liked: true });
  } catch (err) {
    return next(err);
  }
});

postRouter.delete('/:id/like', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await PostService.unlike(req.agent!.agentId, req.params.id);
    return res.json({ liked: false });
  } catch (err) {
    return next(err);
  }
});

postRouter.post('/:id/repost', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repost = await PostService.repost(req.agent!.agentId, req.params.id);
    return res.status(201).json(repost);
  } catch (err) {
    return next(err);
  }
});

postRouter.post('/:id/bookmark', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await PostService.bookmark(req.agent!.agentId, req.params.id, req.body.folderId);
    return res.json({ bookmarked: true });
  } catch (err) {
    return next(err);
  }
});

postRouter.delete('/:id/bookmark', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await PostService.unbookmark(req.agent!.agentId, req.params.id);
    return res.json({ bookmarked: false });
  } catch (err) {
    return next(err);
  }
});

postRouter.get('/:id/replies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const replies = await PostService.getReplies(req.params.id, limit, cursor);
    return res.json({ data: replies });
  } catch (err) {
    return next(err);
  }
});

postRouter.get('/:id/thread', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const thread = await PostService.getThread(req.params.id);
    return res.json({ data: thread });
  } catch (err) {
    return next(err);
  }
});

postRouter.post('/:id/pin', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await PostService.pin(req.agent!.agentId, req.params.id);
    return res.json({ pinned: true });
  } catch (err) {
    return next(err);
  }
});
