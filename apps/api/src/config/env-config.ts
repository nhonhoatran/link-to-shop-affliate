import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');
const positiveInt = z.coerce.number().int().positive();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: positiveInt.default(4000),

  MONGODB_URI: z.string().min(1),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_MAX_AGE_HOURS: positiveInt.default(168),
  // Unset: secure cookies in production only. Plain-HTTP deployments must set "false" explicitly.
  SESSION_COOKIE_SECURE: booleanString.optional(),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanString.default(true),
  MEDIA_PUBLIC_BASE_URL: z.string().min(1),

  WEB_REVALIDATE_URL: z.string().url(),
  REVALIDATE_SECRET: z.string().min(16, 'REVALIDATE_SECRET must be at least 16 characters'),

  UPLOAD_MAX_MB: positiveInt.default(10),
  // Hard cap for the admin-configurable upload limit; the Caddy body limit uses the same value.
  UPLOAD_MAX_MB_CEILING: positiveInt.default(20),
  WEBP_QUALITY: z.coerce.number().int().min(1).max(100).default(82),
  IMAGE_MAX_EDGE_MODEL: positiveInt.default(1600),
  IMAGE_MAX_EDGE_ITEM: positiveInt.default(800),

  ADMIN_PAGE_SIZE_DEFAULT: positiveInt.default(20),
  ADMIN_PAGE_SIZE_MAX: positiveInt.default(100),

  ALLOWED_ORIGIN: z.string().min(1),
});

export type Env = Omit<z.infer<typeof envSchema>, 'SESSION_COOKIE_SECURE'> & { SESSION_COOKIE_SECURE: boolean };

export class EnvConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((line) => `  - ${line}`).join('\n')}`);
    this.name = 'EnvConfigError';
  }
}

export const parseEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvConfigError(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  }
  if (result.data.ADMIN_PAGE_SIZE_DEFAULT > result.data.ADMIN_PAGE_SIZE_MAX) {
    throw new EnvConfigError(['ADMIN_PAGE_SIZE_DEFAULT: must not exceed ADMIN_PAGE_SIZE_MAX']);
  }
  if (result.data.UPLOAD_MAX_MB > result.data.UPLOAD_MAX_MB_CEILING) {
    throw new EnvConfigError(['UPLOAD_MAX_MB: must not exceed UPLOAD_MAX_MB_CEILING']);
  }
  return { ...result.data, SESSION_COOKIE_SECURE: result.data.SESSION_COOKIE_SECURE ?? result.data.NODE_ENV === 'production' };
};

let cached: Env | undefined;

export const getEnv = (): Env => {
  cached ??= parseEnv();
  return cached;
};

export const resetEnvCache = (): void => {
  cached = undefined;
};
