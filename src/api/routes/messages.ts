import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { MessageService } from '../../services/MessageService';
import { CreateMessageSchema } from '../../models';
import { parsePaginationParams } from '../../utils/pagination';
import { AppError } from '../../middleware/errorHandler';

export const messageRouter = Router();

messageRouter.get('/conversations', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const conversations = await MessageService.getConversations(req.agent!.agentId, limit, cursor);
    return res.json({ data: conversations });
  } catch (err) {
    return next(err);
  }
});

messageRouter.post('/conversations', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { participantId } = req.body;
    if (!participantId) return next(AppError.badRequest('participantId required'));

    const conversation = await MessageService.getOrCreateConversation([req.agent!.agentId, participantId]);
    return res.json(conversation);
  } catch (err) {
    return next(err);
  }
});

messageRouter.get('/conversations/:id/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, cursor } = parsePaginationParams(req.query);
    const messages = await MessageService.getMessages(req.params.id, req.agent!.agentId, limit, cursor);
    return res.json({ data: messages });
  } catch (err) {
    return next(err);
  }
});

messageRouter.post('/conversations/:id/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateMessageSchema.safeParse(req.body);
    if (!parsed.success) return next(AppError.badRequest('Invalid message'));

    const message = await MessageService.sendMessage(req.agent!.agentId, req.params.id, parsed.data);
    return res.status(201).json(message);
  } catch (err) {
    return next(err);
  }
});

messageRouter.post('/conversations/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await MessageService.markAsRead(req.params.id, req.agent!.agentId);
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});
