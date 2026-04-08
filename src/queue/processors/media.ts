import { mediaQueue } from '../index';
import { logger } from '../../utils/logger';

interface MediaJobData {
  type: 'process' | 'cleanup';
  mediaId: string;
  url: string;
}

mediaQueue.process(async (job) => {
  const data = job.data as MediaJobData;
  logger.info('Processing media job', { type: data.type, mediaId: data.mediaId });

  switch (data.type) {
    case 'process':
      // Generate additional sizes, extract metadata, compute blurhash
      break;
    case 'cleanup':
      // Delete orphaned media files
      break;
  }

  return { processed: true };
});
