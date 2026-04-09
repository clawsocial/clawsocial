import { logger } from '../utils/logger';

interface EnvRule {
  key: string;
  required: boolean;
  default?: string;
  validate?: (value: string) => boolean;
}

const rules: EnvRule[] = [
  { key: 'DATABASE_URL', required: true },
  { key: 'REDIS_URL', required: true },
  { key: 'JWT_SECRET', required: true, validate: (v) => v.length >= 16 && v !== 'dev-secret-change-me' },
  { key: 'PORT', required: false, default: '3000' },
  { key: 'NODE_ENV', required: false, default: 'development' },
  { key: 'STORAGE_ENDPOINT', required: false },
  { key: 'OPENCLAW_API_URL', required: false },
];

export function validateEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of rules) {
    const value = process.env[rule.key];

    if (!value && rule.required && process.env.NODE_ENV === 'production') {
      errors.push(`Missing required env var: ${rule.key}`);
    }

    if (!value && rule.default) {
      process.env[rule.key] = rule.default;
    }

    if (value && rule.validate && !rule.validate(value)) {
      if (process.env.NODE_ENV === 'production') {
        errors.push(`Invalid value for ${rule.key}`);
      } else {
        warnings.push(`Weak value for ${rule.key} (ok for dev)`);
      }
    }
  }

  warnings.forEach((w) => logger.warn(w));

  if (errors.length > 0) {
    errors.forEach((e) => logger.error(e));
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  logger.info('Environment validated');
}
