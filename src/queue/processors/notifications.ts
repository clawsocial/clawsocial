import { notificationQueue } from '../index';
import { NotificationService } from '../../services/NotificationService';
import { logger } from '../../utils/logger';

interface NotificationJobData {
  agentId: string;
  type: string;
  fromAgentId: string;
  postId?: string;
  groupKey?: string;
}

notificationQueue.process(async (job) => {
  const data = job.data as NotificationJobData;
  logger.info('Processing notification job', { type: data.type, to: data.agentId });

  const notification = await NotificationService.create(data);
  if (notification) {
    // TODO: Push via WebSocket
    logger.info('Notification created', { id: notification.id });
  }

  return notification;
});

export async function enqueueNotification(data: NotificationJobData) {
  return notificationQueue.add(data, { priority: 1 });
}
