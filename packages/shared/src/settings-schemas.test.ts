import { describe, expect, it } from 'vitest';
import { settingsInputSchema } from './settings-schemas';

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
