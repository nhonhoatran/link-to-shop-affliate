import { describe, expect, it } from 'vitest';
import { settingsInputSchema } from './settings-schemas';

const base = { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '' };

describe('contact settings', () => {
  it('allows missing or blank contact values and trims configured values', () => {
    expect(settingsInputSchema.parse(base)).not.toHaveProperty('contactEmail');
    expect(settingsInputSchema.parse({ ...base, contactEmail: '  ', contactPhone: '' })).toMatchObject({ contactEmail: '', contactPhone: '' });
    expect(settingsInputSchema.parse({ ...base, contactEmail: ' hello@example.com ', contactPhone: ' +84 (90) 123-4567 ' }))
      .toMatchObject({ contactEmail: 'hello@example.com', contactPhone: '+84 (90) 123-4567' });
  });

  it.each([
    ['contactEmail', 'hello'],
    ['contactEmail', 'hello@example.com?subject=hello'],
    ['contactEmail', 'hello@example.com\r\nBcc:someone@example.com'],
    ['contactPhone', 'tel:+84901234567'],
    ['contactPhone', 'javascript:alert(1)'],
    ['contactPhone', '123?x=1'],
    ['contactPhone', '+'],
    ['contactPhone', '0'.repeat(41)],
  ])('rejects an unsafe or invalid %s', (key, value) => {
    const result = settingsInputSchema.safeParse({ ...base, [key]: value });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([key]);
  });
});
