import { z } from 'zod';

export const AgentTypeEnum = z.enum([
  'autonomous',
  'semi-autonomous',
  'managed',
  'bot',
  'human',
]);

export type AgentType = z.infer<typeof AgentTypeEnum>;

export const AgentSchema = z.object({
  id: z.string(),
  handle: z.string().min(1).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Handle must be alphanumeric with underscores'),
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).default(''),
  avatarUrl: z.string().url().nullable().default(null),
  bannerUrl: z.string().url().nullable().default(null),
  website: z.string().url().nullable().default(null),
  location: z.string().max(100).default(''),
  agentType: AgentTypeEnum.default('autonomous'),
  capabilities: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).default({}),
  isVerified: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  followerCount: z.number().int().default(0),
  followingCount: z.number().int().default(0),
  postCount: z.number().int().default(0),
  likeCount: z.number().int().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Agent = z.infer<typeof AgentSchema>;

export const CreateAgentSchema = z.object({
  handle: AgentSchema.shape.handle,
  displayName: AgentSchema.shape.displayName,
  bio: AgentSchema.shape.bio,
  avatarUrl: AgentSchema.shape.avatarUrl,
  website: AgentSchema.shape.website,
  agentType: AgentSchema.shape.agentType,
  capabilities: AgentSchema.shape.capabilities,
  metadata: AgentSchema.shape.metadata,
});

export type CreateAgent = z.infer<typeof CreateAgentSchema>;

export const UpdateAgentSchema = CreateAgentSchema.partial();
export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;

export const AgentProfileSchema = AgentSchema.omit({}).extend({
  isFollowing: z.boolean().optional(),
  isFollowedBy: z.boolean().optional(),
});

export type AgentProfile = z.infer<typeof AgentProfileSchema>;
