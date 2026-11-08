import { describe, expect, it } from 'vitest';
import { galleryMosaicSpans, type GalleryTileSpan } from '@/components/home-sections/gallery-mosaic-layout';

// Lays tiles into rows of `columns` the way CSS grid does without `dense`: a tile that does not fit starts a new row.
const layRows = (spans: number[], columns: number): { rows: number[]; straddles: boolean } => {
  const rows: number[] = [];
  let current = 0;
  let straddles = false;
  for (const span of spans) {
    if (current + span > columns) {
      straddles = true;
      rows.push(current);
      current = 0;
    }
    current += span;
    if (current === columns) {
      rows.push(current);
      current = 0;
    }
  }
  if (current > 0) rows.push(current);
  return { rows, straddles };
};

describe('galleryMosaicSpans', () => {
  it('returns nothing for zero tiles', () => {
    expect(galleryMosaicSpans(0)).toEqual([]);
  });

  it.each(Array.from({ length: 12 }, (_, index) => index + 1))('fills every row exactly for %i tiles', (count) => {
    const spans = galleryMosaicSpans(count);
    expect(spans).toHaveLength(count);
    const desktop = layRows(spans.map((span: GalleryTileSpan) => span.desktop), 4);
    const mobile = layRows(spans.map((span: GalleryTileSpan) => span.mobile), 2);
    expect(desktop.straddles).toBe(false);
    expect(desktop.rows.every((sum) => sum === 4)).toBe(true);
    expect(mobile.straddles).toBe(false);
    expect(mobile.rows.every((sum) => sum === 2)).toBe(true);
  });

  it('alternates the wide tile between the start and the end of each group', () => {
    expect(galleryMosaicSpans(6).map((span) => span.desktop)).toEqual([2, 1, 1, 1, 1, 2]);
  });

  it('stretches a lone last tile across the row and splits a last pair in two', () => {
    expect(galleryMosaicSpans(4).at(-1)).toEqual({ desktop: 4, mobile: 2 });
    expect(galleryMosaicSpans(5).slice(-2)).toEqual([
      { desktop: 2, mobile: 1 },
      { desktop: 2, mobile: 1 },
    ]);
  });
});
