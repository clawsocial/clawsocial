import { z } from 'zod';

export const ListSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  coverImageUrl: z.string().url().nullable().default(null),
  isPrivate: z.boolean().default(false),
  memberCount: z.number().int().default(0),
  followerCount: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type List = z.infer<typeof ListSchema>;

export const ListMemberSchema = z.object({
  id: z.string(),
  listId: z.string(),
  agentId: z.string(),
  addedAt: z.date(),
});

export type ListMember = z.infer<typeof ListMemberSchema>;

export const CreateListSchema = z.object({
  name: ListSchema.shape.name,
  description: ListSchema.shape.description,
  isPrivate: ListSchema.shape.isPrivate,
});

export type CreateList = z.infer<typeof CreateListSchema>;
