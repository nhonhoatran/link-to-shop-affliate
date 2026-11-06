import { describe, expect, it } from 'vitest';
import { formatAdminDate } from '@/lib/format-admin-date';
import { getWebEnv } from '@/lib/web-env';

const base = {
  API_INTERNAL_URL: 'http://api.test:4000',
  SITE_URL: 'https://shop.example.test',
  MEDIA_PUBLIC_BASE_URL: '/media',
  REVALIDATE_SECRET: 'test-secret-0123456789',
} as unknown as NodeJS.ProcessEnv;

describe('getWebEnv optional settings', () => {
  it('defaults PUBLIC_REVALIDATE_SECONDS to 300 and ADMIN_TIME_ZONE to Asia/Ho_Chi_Minh', () => {
    const env = getWebEnv(base);
    expect(env.PUBLIC_REVALIDATE_SECONDS).toBe(300);
    expect(env.ADMIN_TIME_ZONE).toBe('Asia/Ho_Chi_Minh');
  });

  it('treats empty values as not set', () => {
    const env = getWebEnv({ ...base, PUBLIC_REVALIDATE_SECONDS: '', ADMIN_TIME_ZONE: '' });
    expect(env.PUBLIC_REVALIDATE_SECONDS).toBe(300);
    expect(env.ADMIN_TIME_ZONE).toBe('Asia/Ho_Chi_Minh');
  });

  it('reads both values from the environment', () => {
    const env = getWebEnv({ ...base, PUBLIC_REVALIDATE_SECONDS: '60', ADMIN_TIME_ZONE: 'UTC' });
    expect(env.PUBLIC_REVALIDATE_SECONDS).toBe(60);
    expect(env.ADMIN_TIME_ZONE).toBe('UTC');
  });

  it.each([
    ['PUBLIC_REVALIDATE_SECONDS', '0'],
    ['PUBLIC_REVALIDATE_SECONDS', 'soon'],
    ['PUBLIC_REVALIDATE_SECONDS', '1.5'],
    ['ADMIN_TIME_ZONE', 'Mars/Olympus'],
  ])('rejects an invalid %s=%s', (name, value) => {
    expect(() => getWebEnv({ ...base, [name]: value })).toThrow(name);
  });
});

describe('formatAdminDate', () => {
  const iso = '2026-11-05T20:00:00.000Z';

  it('uses the given time zone, so the same instant reads differently per zone', () => {
    expect(formatAdminDate(iso, 'Asia/Ho_Chi_Minh')).toBe('6/11/26');
    expect(formatAdminDate(iso, 'UTC')).toBe('5/11/26');
  });

  it('adds the time on request', () => {
    expect(formatAdminDate(iso, 'Asia/Ho_Chi_Minh', true)).toMatch(/03:00/);
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatAdminDate('not a date', 'UTC')).toBe('');
  });
});
