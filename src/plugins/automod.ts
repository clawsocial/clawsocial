import { Plugin } from './types';
import { ModerationService } from '../services/ModerationService';
import { logger } from '../utils/logger';

export const autoModPlugin: Plugin = {
  name: 'automod',
  version: '0.1.0',
  description: 'Automatic content moderation on post creation',
  hooks: {
    async onPostCreate(post: any) {
      const result = await ModerationService.checkContent(post.content);
      if (result.flagged) {
        logger.warn('Post flagged by automod', { postId: post.id, reason: result.reason });
      }
    },
  },
};
