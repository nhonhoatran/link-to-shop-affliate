import { describe, expect, it } from 'vitest';
import { EnvConfigError, parseEnv } from './env-config';

const validEnv = {
  MONGODB_URI: 'mongodb://localhost:27017/under30ss',
  SESSION_SECRET: 's'.repeat(32),
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'under30ss',
  S3_ACCESS_KEY: 'access',
  S3_SECRET_KEY: 'secret',
  MEDIA_PUBLIC_BASE_URL: 'http://localhost:8080/media',
  WEB_REVALIDATE_URL: 'http://web:3000/api/revalidate',
  REVALIDATE_SECRET: 'r'.repeat(16),
  ALLOWED_ORIGIN: 'http://localhost:8080',
};

describe('parseEnv', () => {
  it('applies defaults and coerces numbers and booleans', () => {
    const env = parseEnv({ ...validEnv, PORT: '4100', S3_FORCE_PATH_STYLE: 'false' });
    expect(env.PORT).toBe(4100);
    expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    expect(env.NODE_ENV).toBe('development');
    expect(env.ADMIN_PAGE_SIZE_DEFAULT).toBeLessThanOrEqual(env.ADMIN_PAGE_SIZE_MAX);
  });

  it('fails fast listing every missing variable', () => {
    const { MONGODB_URI: _omit, S3_BUCKET: _omit2, ...rest } = validEnv;
    expect(() => parseEnv(rest)).toThrow(EnvConfigError);
    try {
      parseEnv(rest);
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('MONGODB_URI');
      expect(message).toContain('S3_BUCKET');
    }
  });

  it('rejects a short session secret', () => {
    expect(() => parseEnv({ ...validEnv, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });

  it('derives SESSION_COOKIE_SECURE from NODE_ENV unless set explicitly', () => {
    expect(parseEnv({ ...validEnv, NODE_ENV: 'production' }).SESSION_COOKIE_SECURE).toBe(true);
    expect(parseEnv({ ...validEnv, NODE_ENV: 'development' }).SESSION_COOKIE_SECURE).toBe(false);
    expect(parseEnv({ ...validEnv, NODE_ENV: 'production', SESSION_COOKIE_SECURE: 'false' }).SESSION_COOKIE_SECURE).toBe(false);
    expect(parseEnv({ ...validEnv, NODE_ENV: 'development', SESSION_COOKIE_SECURE: 'true' }).SESSION_COOKIE_SECURE).toBe(true);
    expect(() => parseEnv({ ...validEnv, SESSION_COOKIE_SECURE: 'yes' })).toThrow(/SESSION_COOKIE_SECURE/);
  });

  it('rejects an upload limit above the ceiling', () => {
    const env = parseEnv(validEnv);
    expect(env.UPLOAD_MAX_MB_CEILING).toBeGreaterThanOrEqual(env.UPLOAD_MAX_MB);
    expect(() => parseEnv({ ...validEnv, UPLOAD_MAX_MB: '30', UPLOAD_MAX_MB_CEILING: '20' })).toThrow(/UPLOAD_MAX_MB/);
  });

  it('applies public listing defaults and rejects values above PUBLIC_PAGE_SIZE_MAX', () => {
    const env = parseEnv(validEnv);
    expect([env.PUBLIC_LOOKS_PAGE_SIZE, env.PUBLIC_RELATED_OUTFITS_COUNT, env.PUBLIC_PAGE_SIZE_MAX]).toEqual([12, 8, 48]);
    expect(() => parseEnv({ ...validEnv, PUBLIC_LOOKS_PAGE_SIZE: '50', PUBLIC_PAGE_SIZE_MAX: '48' })).toThrow(/PUBLIC_LOOKS_PAGE_SIZE/);
    expect(() => parseEnv({ ...validEnv, PUBLIC_LOOKS_PAGE_SIZE: '4', PUBLIC_RELATED_OUTFITS_COUNT: '9', PUBLIC_PAGE_SIZE_MAX: '8' })).toThrow(
      /PUBLIC_RELATED_OUTFITS_COUNT/,
    );
  });

  it('rejects a default page size larger than the maximum', () => {
    expect(() => parseEnv({ ...validEnv, ADMIN_PAGE_SIZE_DEFAULT: '50', ADMIN_PAGE_SIZE_MAX: '10' })).toThrow(
      /ADMIN_PAGE_SIZE_DEFAULT/,
    );
  });
});
