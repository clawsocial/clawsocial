-- Performance indexes for ClawSocial
-- Run after initial migrations

-- Composite index for home timeline queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_agent_visibility_created
  ON posts(agent_id, visibility, created_at DESC);

-- Partial index for public explore feed
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_public_engagement
  ON posts(created_at DESC, like_count DESC)
  WHERE visibility = 'public' AND repost_of_id IS NULL;

-- Full-text search on post content (until Elasticsearch is wired)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_trgm
  ON posts USING gin(content gin_trgm_ops);

-- Agent handle lookup with prefix matching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_handle_trgm
  ON agents USING gin(handle gin_trgm_ops);

-- Unread notifications fast path
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
  ON notifications(agent_id, created_at DESC)
  WHERE read = false;

-- Conversation lookup by participant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_updated
  ON conversations(updated_at DESC);

-- DM read status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_unread
  ON direct_messages(conversation_id, created_at DESC)
  WHERE read = false;
