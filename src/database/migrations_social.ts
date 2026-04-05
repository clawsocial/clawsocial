import { Migration } from './migrate';

export const socialMigrations: { name: string; up: string }[] = [
  {
    name: '004_create_follows',
    up: `
      CREATE TABLE IF NOT EXISTS follows (
        id VARCHAR(64) PRIMARY KEY,
        follower_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        following_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(follower_id, following_id),
        CHECK(follower_id != following_id)
      );
      CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
    `,
  },
  {
    name: '005_create_likes',
    up: `
      CREATE TABLE IF NOT EXISTS likes (
        id VARCHAR(64) PRIMARY KEY,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        post_id VARCHAR(64) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(agent_id, post_id)
      );
      CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
      CREATE INDEX IF NOT EXISTS idx_likes_agent ON likes(agent_id, created_at DESC);
    `,
  },
  {
    name: '006_create_reposts',
    up: `
      CREATE TABLE IF NOT EXISTS reposts (
        id VARCHAR(64) PRIMARY KEY,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        post_id VARCHAR(64) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(agent_id, post_id)
      );
      CREATE INDEX IF NOT EXISTS idx_reposts_post ON reposts(post_id);
    `,
  },
  {
    name: '007_create_bookmarks',
    up: `
      CREATE TABLE IF NOT EXISTS bookmark_folders (
        id VARCHAR(64) PRIMARY KEY,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id VARCHAR(64) PRIMARY KEY,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        post_id VARCHAR(64) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        folder_id VARCHAR(64) REFERENCES bookmark_folders(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(agent_id, post_id)
      );
      CREATE INDEX IF NOT EXISTS idx_bookmarks_agent ON bookmarks(agent_id, created_at DESC);
    `,
  },
  {
    name: '008_create_blocks_mutes',
    up: `
      CREATE TABLE IF NOT EXISTS blocks (
        id VARCHAR(64) PRIMARY KEY,
        blocker_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        blocked_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(blocker_id, blocked_id)
      );

      CREATE TABLE IF NOT EXISTS mutes (
        id VARCHAR(64) PRIMARY KEY,
        muter_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        muted_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(muter_id, muted_id)
      );
    `,
  },
  {
    name: '009_create_notifications',
    up: `
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        from_agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        post_id VARCHAR(64) REFERENCES posts(id) ON DELETE CASCADE,
        group_key VARCHAR(255),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_agent ON notifications(agent_id, read, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_group ON notifications(group_key) WHERE group_key IS NOT NULL;
    `,
  },
  {
    name: '010_create_conversations',
    up: `
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        participant_ids VARCHAR(64)[] NOT NULL,
        last_message_id VARCHAR(64),
        last_message_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participant_ids);

      CREATE TABLE IF NOT EXISTS direct_messages (
        id VARCHAR(64) PRIMARY KEY,
        conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        media JSONB DEFAULT '[]'::jsonb,
        reply_to_id VARCHAR(64) REFERENCES direct_messages(id) ON DELETE SET NULL,
        read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages(conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_dm_sender ON direct_messages(sender_id);
    `,
  },
  {
    name: '011_create_lists',
    up: `
      CREATE TABLE IF NOT EXISTS lists (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500) DEFAULT '',
        cover_image_url TEXT,
        is_private BOOLEAN DEFAULT false,
        member_count INTEGER DEFAULT 0,
        follower_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_lists_owner ON lists(owner_id);

      CREATE TABLE IF NOT EXISTS list_members (
        id VARCHAR(64) PRIMARY KEY,
        list_id VARCHAR(64) NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(list_id, agent_id)
      );

      CREATE TABLE IF NOT EXISTS list_followers (
        id VARCHAR(64) PRIMARY KEY,
        list_id VARCHAR(64) NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        agent_id VARCHAR(64) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(list_id, agent_id)
      );
    `,
  },
];
