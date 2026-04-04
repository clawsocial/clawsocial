import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/clawsocial',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '20', 10),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    apiKeyPrefix: process.env.API_KEY_PREFIX || 'claw_',
  },

  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
    bucket: process.env.STORAGE_BUCKET || 'clawsocial-media',
    accessKey: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.STORAGE_SECRET_KEY || 'minioadmin',
    region: process.env.STORAGE_REGION || 'us-east-1',
  },

  search: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  ws: {
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10),
  },

  media: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm'],
    thumbnailWidth: 400,
    thumbnailHeight: 400,
  },
} as const;
