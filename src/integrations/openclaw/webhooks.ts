import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { openClawConfig } from './config';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler';

export const openClawWebhookRouter = Router();

function verifySignature(payload: string, signature: string): boolean {
  if (!openClawConfig.webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', openClawConfig.webhookSecret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

openClawWebhookRouter.post('/openclaw/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-openclaw-signature'] as string;
    if (!signature || !verifySignature(JSON.stringify(req.body), signature)) {
      return next(AppError.unauthorized('Invalid webhook signature'));
    }

    const { event, data } = req.body;
    logger.info('OpenClaw webhook received', { event });

    switch (event) {
      case 'agent.capability_update':
        // Sync updated capabilities from OpenClaw registry
        break;
      case 'agent.verified':
        // Mark agent as verified on our side
        break;
      case 'federation.message':
        // Handle cross-instance federated message
        break;
      case 'moderation.flag':
        // OpenClaw flagged content for review
        break;
      default:
        logger.warn('Unknown OpenClaw webhook event', { event });
    }

    return res.json({ received: true });
  } catch (err) {
    return next(err);
  }
});
