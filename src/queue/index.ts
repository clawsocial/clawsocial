import Bull from 'bull';
import { config } from '../config';
import { logger } from '../utils/logger';

export const notificationQueue = new Bull('notifications', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

export const mediaQueue = new Bull('media', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 200,
    attempts: 2,
  },
});

export const feedQueue = new Bull('feed', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: 200,
    attempts: 3,
  },
});

export const analyticsQueue = new Bull('analytics', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 1,
  },
});

// Error handlers
[notificationQueue, mediaQueue, feedQueue, analyticsQueue].forEach((q) => {
  q.on('failed', (job, err) => {
    logger.error(`Job failed in ${q.name}`, { jobId: job.id, error: err.message });
  });
});

export async function closeQueues() {
  await Promise.all([
    notificationQueue.close(),
    mediaQueue.close(),
    feedQueue.close(),
    analyticsQueue.close(),
  ]);
}
