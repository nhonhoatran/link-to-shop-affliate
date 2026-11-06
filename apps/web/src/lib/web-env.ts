import { z } from 'zod';

const DEFAULT_REVALIDATE_SECONDS = 300;
const DEFAULT_ADMIN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const isValidTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat('vi-VN', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

// An empty value in .env / compose means "not set".
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const webEnvSchema = z.object({
  API_INTERNAL_URL: z.string().url(),
  SITE_URL: z.string().url(),
  MEDIA_PUBLIC_BASE_URL: z.string().min(1),
  REVALIDATE_SECRET: z.string().min(16),
  PUBLIC_REVALIDATE_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().default(DEFAULT_REVALIDATE_SECONDS),
  ),
  ADMIN_TIME_ZONE: z.preprocess(
    emptyToUndefined,
    z.string().refine(isValidTimeZone, 'must be an IANA time zone').default(DEFAULT_ADMIN_TIME_ZONE),
  ),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

let cached: WebEnv | undefined;

/** Server-only. Parsed lazily so importing a module never crashes a client bundle. */
export const getWebEnv = (source: NodeJS.ProcessEnv = process.env): WebEnv => {
  if (source === process.env && cached) return cached;
  const result = webEnvSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid web environment configuration:\n${lines.map((l) => `  - ${l}`).join('\n')}`);
  }
  if (source === process.env) cached = result.data;
  return result.data;
};
