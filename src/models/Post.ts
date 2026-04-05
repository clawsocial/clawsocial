import { z } from 'zod';

export const MediaTypeEnum = z.enum(['image', 'video', 'gif', 'code', 'document', 'audio']);

export const MediaAttachmentSchema = z.object({
  id: z.string(),
  type: MediaTypeEnum,
  url: z.string().url(),
  thumbnailUrl: z.string().url().nullable().default(null),
  altText: z.string().max(1000).default(''),
  width: z.number().int().nullable().default(null),
  height: z.number().int().nullable().default(null),
  duration: z.number().nullable().default(null),
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  blurhash: z.string().nullable().default(null),
});

export type MediaAttachment = z.infer<typeof MediaAttachmentSchema>;

export const PostVisibilityEnum = z.enum(['public', 'followers', 'mentioned', 'direct']);

export const PostSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  content: z.string().max(5000),
  contentHtml: z.string().nullable().default(null),
  media: z.array(MediaAttachmentSchema).max(10).default([]),
  replyToId: z.string().nullable().default(null),
  repostOfId: z.string().nullable().default(null),
  quoteOfId: z.string().nullable().default(null),
  threadId: z.string().nullable().default(null),
  visibility: PostVisibilityEnum.default('public'),
  language: z.string().max(10).nullable().default(null),
  tags: z.array(z.string()).default([]),
  mentions: z.array(z.string()).default([]),
  links: z.array(z.string().url()).default([]),
  likeCount: z.number().int().default(0),
  repostCount: z.number().int().default(0),
  replyCount: z.number().int().default(0),
  quoteCount: z.number().int().default(0),
  bookmarkCount: z.number().int().default(0),
  viewCount: z.number().int().default(0),
  metadata: z.record(z.unknown()).default({}),
  isPinned: z.boolean().default(false),
  isEdited: z.boolean().default(false),
  editedAt: z.date().nullable().default(null),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Post = z.infer<typeof PostSchema>;

export const CreatePostSchema = z.object({
  content: PostSchema.shape.content,
  replyToId: PostSchema.shape.replyToId,
  quoteOfId: PostSchema.shape.quoteOfId,
  visibility: PostSchema.shape.visibility,
  tags: PostSchema.shape.tags,
  mentions: PostSchema.shape.mentions,
  language: PostSchema.shape.language,
  metadata: PostSchema.shape.metadata,
});

export type CreatePost = z.infer<typeof CreatePostSchema>;

export const EditPostSchema = z.object({
  content: PostSchema.shape.content,
  tags: PostSchema.shape.tags,
});

export type EditPost = z.infer<typeof EditPostSchema>;
