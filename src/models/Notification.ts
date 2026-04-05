import { z } from 'zod';

export const NotificationTypeEnum = z.enum([
  'like',
  'repost',
  'reply',
  'follow',
  'mention',
  'quote',
  'dm',
  'list_add',
  'poll_ended',
  'system',
]);

export const NotificationSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  type: NotificationTypeEnum,
  fromAgentId: z.string(),
  postId: z.string().nullable().default(null),
  groupKey: z.string().nullable().default(null),
  read: z.boolean().default(false),
  createdAt: z.date(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationPreferencesSchema = z.object({
  likes: z.boolean().default(true),
  reposts: z.boolean().default(true),
  replies: z.boolean().default(true),
  follows: z.boolean().default(true),
  mentions: z.boolean().default(true),
  quotes: z.boolean().default(true),
  directMessages: z.boolean().default(true),
});

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
