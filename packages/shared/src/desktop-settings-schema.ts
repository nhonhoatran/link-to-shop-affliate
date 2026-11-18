import { z } from 'zod';
import { DEFAULT_POSTER_PROMPT, DEFAULT_POSTER_PROMPT_VERSION } from './poster-analysis-prompt';

export const websiteOriginSchema = z.string().max(2048).refine((value) => {
  if (value === '') return true;
  try {
    const url = new URL(value);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return (url.protocol === 'https:' || (loopback && url.protocol === 'http:'))
      && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/';
  } catch { return false; }
}, 'Dùng origin HTTPS; HTTP chỉ được phép với localhost/127.0.0.1/::1');

export const desktopSettingsSchema = z.strictObject({
  siteUrl: websiteOriginSchema.default(''),
  siteName: z.string().trim().max(100).default(''),
  cli: z.strictObject({
    executable: z.string().trim().min(1).max(2048).default('codex'),
    profile: z.string().trim().max(100).default(''),
    model: z.string().trim().max(100).default(''),
  }).default({ executable: 'codex', profile: '', model: '' }),
  prompt: z.strictObject({
    version: z.string().trim().min(1).max(80).default(DEFAULT_POSTER_PROMPT_VERSION),
    text: z.string().trim().min(1).max(30_000).default(DEFAULT_POSTER_PROMPT),
  }).default({ version: DEFAULT_POSTER_PROMPT_VERSION, text: DEFAULT_POSTER_PROMPT }),
  limits: z.strictObject({
    maxFiles: z.number().int().positive().max(5000).default(500),
    maxFileBytes: z.number().int().positive().max(100 * 1024 * 1024).default(20 * 1024 * 1024),
    maxSourcePixels: z.number().int().positive().max(200_000_000).default(80_000_000),
    maxScanEntries: z.number().int().positive().max(100_000).default(10_000),
    pageSize: z.number().int().positive().max(100).default(20),
    analysisTimeoutMs: z.number().int().min(1000).max(30 * 60_000).default(3 * 60_000),
    syncTimeoutMs: z.number().int().min(1000).max(10 * 60_000).default(60_000),
    maxOutputBytes: z.number().int().min(4096).max(10 * 1024 * 1024).default(1024 * 1024),
    allowedExtensions: z.array(z.enum(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']))
      .min(1).default(['.jpg', '.jpeg', '.png', '.webp']),
  }).default({ maxFiles: 500, maxFileBytes: 20 * 1024 * 1024, maxSourcePixels: 80_000_000,
    maxScanEntries: 10_000, pageSize: 20, analysisTimeoutMs: 180_000, syncTimeoutMs: 60_000,
    maxOutputBytes: 1024 * 1024, allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'] }),
});

export const desktopSettingsViewSchema = z.strictObject({
  settings: desktopSettingsSchema,
  credential: z.strictObject({
    configured: z.boolean(), mask: z.string().nullable(), origin: z.string().nullable(), encryptionAvailable: z.boolean(),
    warning: z.string().optional(),
  }),
});
export const DEFAULT_DESKTOP_SETTINGS = desktopSettingsSchema.parse({});
export type DesktopSettings = z.infer<typeof desktopSettingsSchema>;
export type DesktopSettingsView = z.infer<typeof desktopSettingsViewSchema>;
