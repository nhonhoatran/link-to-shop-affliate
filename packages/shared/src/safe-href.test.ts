import { describe, expect, it } from 'vitest';
import { objectIdSchema } from './object-id-schema';
import { externalHttpUrlSchema, isInternalHref, safeHrefSchema } from './safe-href';

const BAD = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'data:text/html;base64,AAAA',
  'vbscript:x',
  '//evil.example',
  '//evil.example/path',
  '/\\evil.example',
  '\\\\evil.example',
  '/looks page',
  ' /looks',
  '/looks\n',
  '/looks\u0000',
  'looks',
  'ftp://example.com',
  'https://',
  'https:evil.example',
  'https://evil.example\\@good.example',
  '',
];

describe('safeHrefSchema', () => {
  it.each(BAD)('rejects %j', (href) => {
    expect(safeHrefSchema.safeParse(href).success).toBe(false);
  });

  it.each(['/', '/looks', '/collections/ao-thun?page=2', '/look/a#top', 'https://shopee.vn/product?x=1', 'http://example.com'])(
    'accepts %s',
    (href) => {
      expect(safeHrefSchema.safeParse(href).success).toBe(true);
    },
  );

  it('rejects links longer than 2048 characters', () => {
    expect(safeHrefSchema.safeParse(`/${'a'.repeat(2048)}`).success).toBe(false);
  });
});

describe('externalHttpUrlSchema', () => {
  it('accepts only absolute http(s) URLs', () => {
    expect(externalHttpUrlSchema.safeParse('https://facebook.com/shop').success).toBe(true);
    expect(externalHttpUrlSchema.safeParse('/looks').success).toBe(false);
    expect(externalHttpUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });
});

describe('isInternalHref', () => {
  it('tells internal paths from everything else', () => {
    expect(isInternalHref('/looks')).toBe(true);
    expect(isInternalHref('//evil.example')).toBe(false);
    expect(isInternalHref('https://example.com')).toBe(false);
  });
});

describe('objectIdSchema', () => {
  it('accepts 24 lowercase hex characters only', () => {
    expect(objectIdSchema.safeParse('64b7f0c2a1b2c3d4e5f60718').success).toBe(true);
    expect(objectIdSchema.safeParse('64b7f0c2a1b2c3d4e5f6071').success).toBe(false);
    expect(objectIdSchema.safeParse('zzb7f0c2a1b2c3d4e5f60718').success).toBe(false);
    expect(objectIdSchema.safeParse('').success).toBe(false);
  });
});
