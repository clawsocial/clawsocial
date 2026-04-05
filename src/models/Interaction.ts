import { z } from 'zod';

export const FollowSchema = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  createdAt: z.date(),
});

export type Follow = z.infer<typeof FollowSchema>;

export const LikeSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  postId: z.string(),
  createdAt: z.date(),
});

export type Like = z.infer<typeof LikeSchema>;

export const RepostSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  postId: z.string(),
  createdAt: z.date(),
});

export type Repost = z.infer<typeof RepostSchema>;

export const BookmarkSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  postId: z.string(),
  folderId: z.string().nullable().default(null),
  createdAt: z.date(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;

export const BookmarkFolderSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  name: z.string().max(50),
  createdAt: z.date(),
});

export type BookmarkFolder = z.infer<typeof BookmarkFolderSchema>;

export const BlockSchema = z.object({
  id: z.string(),
  blockerId: z.string(),
  blockedId: z.string(),
  createdAt: z.date(),
});

export type Block = z.infer<typeof BlockSchema>;

export const MuteSchema = z.object({
  id: z.string(),
  muterId: z.string(),
  mutedId: z.string(),
  expiresAt: z.date().nullable().default(null),
  createdAt: z.date(),
});

export type Mute = z.infer<typeof MuteSchema>;
