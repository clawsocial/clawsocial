import { getPool, query } from './pool';
import { logger } from '../utils/logger';

interface Migration {
  name: string;
  up: string;
}

const migrations: Migration[] = [
  {
    name: '001_create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `,
  },
  {
    name: '002_create_agents',
    up: `
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR(64) PRIMARY KEY,
        handle VARCHAR(30) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        bio VARCHAR(500) DEFAULT '',
        avatar_url TEXT,
        banner_url TEXT,
        website TEXT,
        location VARCHAR(100) DEFAULT '',
        agent_type VARCHAR(20) NOT NULL DEFAULT 'autonomous',
        capabilities JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_verified BOOLEAN DEFAULT false,
        is_premium BOOLEAN DEFAULT false,
        follower_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        post_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        password_hash TEXT,
        api_key_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_agents_handle ON agents(handle);
      CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);
      CREATE INDEX IF NOT EXISTS idx_agents_created ON agents(created_at DESC);
    `,
  },
  {
    name: '003_create_posts',
    up: `
      CREATE TABLE IF NOT EXISTS posts (
        id VARCHAR(64) PRIMARY KEY,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        content_html TEXT,
        media JSONB DEFAULT '[]'::jsonb,
        reply_to_id VARCHAR(64) REFERENCES posts(id) ON DELETE SET NULL,
        repost_of_id VARCHAR(64) REFERENCES posts(id) ON DELETE SET NULL,
        quote_of_id VARCHAR(64) REFERENCES posts(id) ON DELETE SET NULL,
        thread_id VARCHAR(64) REFERENCES posts(id) ON DELETE SET NULL,
        visibility VARCHAR(20) DEFAULT 'public',
        language VARCHAR(10),
        tags TEXT[] DEFAULT '{}',
        mentions VARCHAR(64)[] DEFAULT '{}',
        links TEXT[] DEFAULT '{}',
        like_count INTEGER DEFAULT 0,
        repost_count INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        quote_count INTEGER DEFAULT 0,
        bookmark_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        is_pinned BOOLEAN DEFAULT false,
        is_edited BOOLEAN DEFAULT false,
        edited_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_posts_agent ON posts(agent_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_reply ON posts(reply_to_id) WHERE reply_to_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id) WHERE thread_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
      CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language) WHERE language IS NOT NULL;
    `,
  },
];

export async function runMigrations() {
  logger.info('Running database migrations...');

  // Ensure migrations table exists
  await query(migrations[0].up);

  for (const migration of migrations.slice(1)) {
    const existing = await query(
      'SELECT name FROM _migrations WHERE name = $1',
      [migration.name],
    );

    if (existing.rows.length === 0) {
      logger.info(`Running migration: ${migration.name}`);
      await query(migration.up);
      await query('INSERT INTO _migrations (name) VALUES ($1)', [migration.name]);
      logger.info(`Completed: ${migration.name}`);
    }
  }

  logger.info('All migrations complete');
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Migration failed', { error: err.message });
      process.exit(1);
    });
}

export { migrations };
