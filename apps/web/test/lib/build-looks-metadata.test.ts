import type { PublicSettingsDto } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { buildLooksMetadata } from '@/lib/seo/build-looks-metadata';

const settings = (seoDescription: string): PublicSettingsDto => ({
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription,
  ogImageUrl: null,
  looksPageSize: 12,
  relatedOutfitsCount: 4,
});

const build = (seoDescription: string) =>
  buildLooksMetadata({ settings: settings(seoDescription), siteUrl: 'https://shop.test', page: 1 });

describe('buildLooksMetadata description', () => {
  it('uses the configured SEO description', () => {
    expect(build('Custom text').description).toBe('Custom text');
  });

  it.each(['', '   '])('falls back to a generated description when the setting is %j', (value) => {
    const metadata = build(value);
    expect(metadata.description).toContain('Shop');
    expect(metadata.openGraph?.description).toBe(metadata.description);
    expect(metadata.twitter?.description).toBe(metadata.description);
  });
});
