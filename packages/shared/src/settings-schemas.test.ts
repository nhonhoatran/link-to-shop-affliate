import { describe, expect, it } from 'vitest';
import { sampleAnnouncementInput } from './fixtures';
import { DEFAULT_ANNOUNCEMENT, publicSettingsSchema, settingsInputSchema } from './settings-schemas';

const base = { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '' };

describe('settingsInputSchema listing fields', () => {
  it('accepts positive integers and absent values', () => {
    expect(settingsInputSchema.safeParse(base).success).toBe(true);
    expect(settingsInputSchema.safeParse({ ...base, looksPageSize: 12, relatedOutfitsCount: 8 }).success).toBe(true);
  });

  it.each([0, -3, 2.5, '12'])('rejects %s', (value) => {
    expect(settingsInputSchema.safeParse({ ...base, looksPageSize: value }).success).toBe(false);
    expect(settingsInputSchema.safeParse({ ...base, relatedOutfitsCount: value }).success).toBe(false);
  });
});

const announcementIssues = (announcement: unknown) => {
  const result = settingsInputSchema.safeParse({ ...base, announcement });
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('settingsInputSchema announcement', () => {
  it('accepts the default (off, empty) and the sample', () => {
    expect(announcementIssues(DEFAULT_ANNOUNCEMENT)).toEqual([]);
    expect(announcementIssues(sampleAnnouncementInput)).toEqual([]);
  });

  it('requires text when enabled and reports it at announcement.text', () => {
    expect(announcementIssues({ enabled: true, text: '' })).toEqual(['announcement.text']);
    expect(announcementIssues({ enabled: true, text: '   ' })).toEqual(['announcement.text']);
  });

  it('rejects text over 160 characters', () => {
    expect(announcementIssues({ enabled: false, text: 'x'.repeat(161) })).toEqual(['announcement.text']);
  });

  it.each(['javascript:alert(1)', '//evil.example', 'data:text/html,x'])('rejects href %s', (href) => {
    expect(announcementIssues({ enabled: true, text: 'Hi', linkLabel: 'Go', href })).toEqual(['announcement.href']);
  });

  it('needs an href when there is a link label', () => {
    expect(announcementIssues({ enabled: true, text: 'Hi', linkLabel: 'Go' })).toEqual(['announcement.href']);
  });
});

describe('settingsInputSchema chrome fields', () => {
  const parse = (extra: Record<string, unknown>) => settingsInputSchema.safeParse({ ...base, ...extra }).success;

  it('accepts a footer and the collections nav fields', () => {
    expect(
      parse({
        collectionsNavEnabled: false,
        collectionsLabel: 'Bộ sưu tập',
        footer: {
          columns: [{ title: 'Về shop', links: [{ label: 'Tất cả outfit', href: '/looks' }] }],
          social: [{ label: 'Facebook', href: 'https://facebook.com/shop' }],
        },
      }),
    ).toBe(true);
  });

  it.each([
    ['unsafe footer link', { footer: { columns: [{ title: 'A', links: [{ label: 'x', href: 'javascript:1' }] }], social: [] } }],
    ['internal social link', { footer: { columns: [], social: [{ label: 'x', href: '/looks' }] } }],
    ['5 footer columns', { footer: { columns: Array.from({ length: 5 }, () => ({ title: 'A', links: [] })), social: [] } }],
    ['9 links in a column', { footer: { columns: [{ title: 'A', links: Array.from({ length: 9 }, () => ({ label: 'x', href: '/a' })) }], social: [] } }],
    ['empty collections label', { collectionsLabel: '' }],
    ['41-char collections label', { collectionsLabel: 'x'.repeat(41) }],
  ])('rejects %s', (_name, extra) => {
    expect(parse(extra)).toBe(false);
  });
});

describe('publicSettingsSchema', () => {
  const publicBase = {
    siteName: 'Shop',
    seoTitle: 'Shop',
    seoDescription: '',
    ogImageUrl: null,
    looksPageSize: 12,
    relatedOutfitsCount: 8,
  };

  it('keeps the chrome fields optional and allows a null announcement', () => {
    expect(publicSettingsSchema.safeParse(publicBase).success).toBe(true);
    expect(publicSettingsSchema.safeParse({ ...publicBase, announcement: null, collectionsNavVisible: true }).success).toBe(true);
  });
});
