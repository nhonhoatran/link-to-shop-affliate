import { describe, expect, it } from 'vitest';
import { SLUG_PATTERN } from './outfit-schemas';
import { slugifyVietnamese } from './slugify-vietnamese';

describe('slugifyVietnamese', () => {
  it.each([
    ['Áo thun Đen', 'ao-thun-den'],
    ['  Quần short jean rách!  ', 'quan-short-jean-rach'],
    ['Giày Sneaker Trắng/Xám', 'giay-sneaker-trang-xam'],
    ['Đặng Thị Ưu', 'dang-thi-uu'],
    ['A -- B', 'a-b'],
    ['', ''],
  ])('%j -> %j', (input, expected) => {
    expect(slugifyVietnamese(input)).toBe(expected);
  });

  it('caps the length at 80 without trailing hyphen and matches slug pattern', () => {
    const slug = slugifyVietnamese(`${'abcdefghi '.repeat(12)}`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
    expect(SLUG_PATTERN.test(slug)).toBe(true);
  });
});
