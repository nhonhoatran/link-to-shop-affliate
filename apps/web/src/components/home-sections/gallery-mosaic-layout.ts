/** Column spans of one tile on the 4-column desktop grid and on the 2-column mobile grid. */
export interface GalleryTileSpan {
  desktop: 1 | 2 | 4;
  mobile: 1 | 2;
}

const NORMAL: GalleryTileSpan = { desktop: 1, mobile: 1 };
const WIDE: GalleryTileSpan = { desktop: 2, mobile: 2 };
const FULL_ROW: GalleryTileSpan = { desktop: 4, mobile: 2 };
const HALF_ROW: GalleryTileSpan = { desktop: 2, mobile: 1 };

const GROUP_SIZE = 3;

/**
 * Deterministic mosaic for any tile count. Tiles come in groups of three: even groups are [wide, normal, normal],
 * odd groups [normal, normal, wide]. A full group fills exactly one desktop row (2+1+1 of 4) and two mobile rows
 * (2, then 1+1 of 2). A short last group stretches to fill its row, so there are never holes and no `dense` flow.
 */
export function galleryMosaicSpans(count: number): GalleryTileSpan[] {
  const spans: GalleryTileSpan[] = [];
  for (let start = 0; start < count; start += GROUP_SIZE) {
    const size = Math.min(GROUP_SIZE, count - start);
    if (size === 1) spans.push(FULL_ROW);
    else if (size === 2) spans.push(HALF_ROW, HALF_ROW);
    else spans.push(...((start / GROUP_SIZE) % 2 === 0 ? [WIDE, NORMAL, NORMAL] : [NORMAL, NORMAL, WIDE]));
  }
  return spans;
}
