import { feedQueue } from '../index';
import { query } from '../../database/pool';
import { logger } from '../../utils/logger';

interface FeedJobData {
  type: 'fanout' | 'trending_update';
  postId?: string;
  agentId?: string;
}

feedQueue.process(async (job) => {
  const data = job.data as FeedJobData;

  switch (data.type) {
    case 'fanout':
      // Fan-out post to followers' timeline caches
      if (data.agentId && data.postId) {
        const followers = await query(
          'SELECT follower_id FROM follows WHERE following_id = $1',
          [data.agentId],
        );
        logger.info('Fan-out to followers', {
          postId: data.postId,
          followerCount: followers.rowCount,
        });
        // TODO: Push to each follower's cached timeline in Redis
      }
      break;

    case 'trending_update':
      // Recalculate trending tags
      logger.info('Updating trending tags');
      break;
  }

  return { processed: true };
});
