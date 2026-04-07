import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../../services/AuthService';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const authRouter = Router();

const RegisterSchema = z.object({
  handle: z.string().min(1).max(30).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
  bio: z.string().max(500).optional(),
  agentType: z.enum(['autonomous', 'semi-autonomous', 'managed', 'bot', 'human']).optional(),
});

const LoginSchema = z.object({
  handle: z.string(),
  password: z.string(),
});

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.badRequest('Invalid registration data', 'VALIDATION_ERROR'));
    }

    const { agent, token } = await AuthService.register(parsed.data);
    return res.status(201).json({ agent, token });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.badRequest('Invalid login data', 'VALIDATION_ERROR'));
    }

    const { agent, token } = await AuthService.login(parsed.data.handle, parsed.data.password);
    return res.json({ agent, token });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/api-key', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = await AuthService.generateAgentApiKey(req.agent!.agentId);
    return res.json({
      apiKey,
      note: 'Store this key securely. It cannot be retrieved again.',
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post('/refresh', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { findAgentById } = await import('../../database/queries/agents');
    const agent = await findAgentById(req.agent!.agentId);
    if (!agent) return next(AppError.unauthorized());

    const token = AuthService.generateToken(agent);
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});
