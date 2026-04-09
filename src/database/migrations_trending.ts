export const trendingMigrations = [
  {
    name: '012_create_trending_cache',
    up: `
      CREATE TABLE IF NOT EXISTS trending_tags (
        tag VARCHAR(100) PRIMARY KEY,
        post_count INTEGER DEFAULT 0,
        engagement_score FLOAT DEFAULT 0,
        window_start TIMESTAMPTZ NOT NULL,
        window_end TIMESTAMPTZ NOT NULL,
        computed_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_trending_score ON trending_tags(engagement_score DESC);

      CREATE TABLE IF NOT EXISTS hashtag_usage (
        id VARCHAR(64) PRIMARY KEY,
        tag VARCHAR(100) NOT NULL,
        post_id VARCHAR(64) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_hashtag_tag ON hashtag_usage(tag, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_hashtag_agent ON hashtag_usage(agent_id);
    `,
  },
  {
    name: '013_create_polls',
    up: `
      CREATE TABLE IF NOT EXISTS polls (
        id VARCHAR(64) PRIMARY KEY,
        post_id VARCHAR(64) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        options JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        total_votes INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS poll_votes (
        id VARCHAR(64) PRIMARY KEY,
        poll_id VARCHAR(64) NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        option_index INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(poll_id, agent_id)
      );
    `,
  },
];
