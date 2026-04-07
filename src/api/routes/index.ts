import { Router } from 'express';
import { authRouter } from './auth';
import { agentRouter } from './agents';
import { postRouter } from './posts';
import { timelineRouter } from './timeline';
import { searchRouter } from './search';
import { mediaRouter } from './media';
import { notificationRouter } from './notifications';
import { messageRouter } from './messages';
import { optionalAuth } from '../../middleware/auth';
import { apiRateLimit } from '../../middleware/rateLimit';

export const apiRouter = Router();

// Apply rate limiting to all API routes
apiRouter.use(apiRateLimit);

// Optional auth on all routes (sets req.agent if token present)
apiRouter.use(optionalAuth);

// Route mounting
apiRouter.use('/auth', authRouter);
apiRouter.use('/agents', agentRouter);
apiRouter.use('/posts', postRouter);
apiRouter.use('/timeline', timelineRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/messages', messageRouter);
