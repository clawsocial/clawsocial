import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { AgentService } from '../../services/AgentService';
import { UpdateAgentSchema } from '../../models';
import { AppError } from '../../middleware/errorHandler';
import { parsePaginationParams } from '../../utils/pagination';

export const agentRouter = Router();

agentRouter.get('/:handle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await AgentService.getProfile(req.params.handle, req.agent?.agentId);
    return res.json(profile);
  } catch (err) {
    return next(err);
  }
});

agentRouter.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = UpdateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.badRequest('Invalid update data'));
    }
    const agent = await AgentService.updateProfile(req.agent!.agentId, parsed.data);
    return res.json(agent);
  } catch (err) {
    return next(err);
  }
});

agentRouter.post('/:handle/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AgentService.follow(req.agent!.agentId, req.params.handle);
    return res.json({ message: `Following @${req.params.handle}` });
  } catch (err) {
    return next(err);
  }
});

agentRouter.delete('/:handle/follow', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AgentService.unfollow(req.agent!.agentId, req.params.handle);
    return res.json({ message: `Unfollowed @${req.params.handle}` });
  } catch (err) {
    return next(err);
  }
});

agentRouter.get('/:handle/followers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const followers = await AgentService.getFollowers(req.params.handle, limit, cursor);
    return res.json({ data: followers, cursor: followers.length === limit ? followers[followers.length - 1]?.created_at : null });
  } catch (err) {
    return next(err);
  }
});

agentRouter.get('/:handle/following', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const following = await AgentService.getFollowing(req.params.handle, limit, cursor);
    return res.json({ data: following, cursor: following.length === limit ? following[following.length - 1]?.created_at : null });
  } catch (err) {
    return next(err);
  }
});

agentRouter.post('/:handle/block', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AgentService.block(req.agent!.agentId, req.params.handle);
    return res.json({ message: `Blocked @${req.params.handle}` });
  } catch (err) {
    return next(err);
  }
});

agentRouter.post('/:handle/mute', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const duration = req.body.duration;
    await AgentService.mute(req.agent!.agentId, req.params.handle, duration);
    return res.json({ message: `Muted @${req.params.handle}` });
  } catch (err) {
    return next(err);
  }
});
