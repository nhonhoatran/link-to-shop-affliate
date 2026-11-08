// Optional tuning knobs that are not part of the required env schema.
// Every value can be overridden through the environment variable named next to it.

const readPositiveInt = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export interface LoginRateLimitConfig {
  windowMs: number;
  /** Failed attempts per IP + email pair: strict, so an attacker cannot lock an account out from elsewhere. */
  maxFailuresPerIpEmail: number;
  /** Failed attempts per email from all IPs combined: loose backstop against distributed guessing. */
  maxFailuresPerEmail: number;
  /** All attempts per IP, successful or not, so rotating emails cannot bypass the limit. */
  maxAttemptsPerIp: number;
}

export const getLoginRateLimit = (): LoginRateLimitConfig => ({
  windowMs: readPositiveInt('LOGIN_RATE_LIMIT_WINDOW_MINUTES', 15) * 60_000,
  maxFailuresPerIpEmail: readPositiveInt('LOGIN_RATE_LIMIT_MAX_FAILURES', 5),
  maxFailuresPerEmail: readPositiveInt('LOGIN_RATE_LIMIT_MAX_FAILURES_PER_EMAIL', 50),
  maxAttemptsPerIp: readPositiveInt('LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP', 20),
});

/** Lifetime of the signed cookie that exempts a known browser from the per-email login limiter. */
export const getDeviceCookieMaxAgeDays = (): number => readPositiveInt('LOGIN_DEVICE_COOKIE_MAX_AGE_DAYS', 90);

export const getHealthTimeoutMs = (): number => readPositiveInt('HEALTH_CHECK_TIMEOUT_MS', 2000);

export const getArgon2MaxConcurrency = (): number => readPositiveInt('ARGON2_MAX_CONCURRENCY', 2);

/** Hash/verify calls allowed to wait for a free slot; beyond that the API answers 503. */
export const getArgon2MaxQueue = (): number => readPositiveInt('ARGON2_MAX_QUEUE', 20);

/** Recently updated outfits shown on the admin overview. */
export const getAdminStatsRecentCount = (): number => readPositiveInt('ADMIN_STATS_RECENT_COUNT', 5);

export const getDefaultSettings = (): { siteName: string; seoTitle: string; seoDescription: string } => ({
  siteName: process.env.DEFAULT_SITE_NAME ?? 'Under30ss',
  seoTitle: process.env.DEFAULT_SEO_TITLE ?? 'Under30ss - Shop the look',
  seoDescription: process.env.DEFAULT_SEO_DESCRIPTION ?? '',
});

export interface NewsletterRateLimitConfig {
  windowMs: number;
  maxPerIp: number;
}

export const getNewsletterRateLimit = (): NewsletterRateLimitConfig => ({
  windowMs: readPositiveInt('NEWSLETTER_RATE_LIMIT_WINDOW_MINUTES', 15) * 60_000,
  maxPerIp: readPositiveInt('NEWSLETTER_RATE_LIMIT_MAX_PER_IP', 10),
});
