import { z } from 'zod';

export const ConversationSchema = z.object({
  id: z.string(),
  participantIds: z.array(z.string()).min(2),
  lastMessageId: z.string().nullable().default(null),
  lastMessageAt: z.date().nullable().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const DirectMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  content: z.string().max(5000),
  media: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    mimeType: z.string(),
  })).default([]),
  replyToId: z.string().nullable().default(null),
  read: z.boolean().default(false),
  readAt: z.date().nullable().default(null),
  createdAt: z.date(),
});

export type DirectMessage = z.infer<typeof DirectMessageSchema>;

export const CreateMessageSchema = z.object({
  content: DirectMessageSchema.shape.content,
  replyToId: DirectMessageSchema.shape.replyToId,
});

export type CreateMessage = z.infer<typeof CreateMessageSchema>;
