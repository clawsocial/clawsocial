import { analyticsQueue } from '../index';
import { query } from '../../database/pool';
import { logger } from '../../utils/logger';

interface AnalyticsJobData {
  type: 'view' | 'impression' | 'engagement';
  postId: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

analyticsQueue.process(async (job) => {
  const data = job.data as AnalyticsJobData;

  switch (data.type) {
    case 'view':
      await query(
        'UPDATE posts SET view_count = view_count + 1 WHERE id = $1',
        [data.postId],
      );
      break;

    case 'engagement':
      logger.info('Tracking engagement', { postId: data.postId, metadata: data.metadata });
      break;
  }

  return { tracked: true };
});
