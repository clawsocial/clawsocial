import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { NotificationService } from '../../services/NotificationService';
import { parsePaginationParams } from '../../utils/pagination';

export const notificationRouter = Router();

notificationRouter.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const notifications = await NotificationService.getForAgent(req.agent!.agentId, limit, cursor);
    return res.json({ data: notifications });
  } catch (err) {
    return next(err);
  }
});

notificationRouter.get('/unread', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await NotificationService.getUnreadCount(req.agent!.agentId);
    return res.json({ count });
  } catch (err) {
    return next(err);
  }
});

notificationRouter.post('/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;
    if (Array.isArray(ids)) {
      await NotificationService.markAsRead(req.agent!.agentId, ids);
    }
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

notificationRouter.post('/read-all', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await NotificationService.markAllAsRead(req.agent!.agentId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});
