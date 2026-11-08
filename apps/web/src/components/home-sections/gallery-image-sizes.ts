import type { GalleryTileSpan } from './gallery-mosaic-layout';

// Tile widths with the container at its 1200px cap (plus 32px gutters, so 1264px viewport) and 8px gaps:
// 4 columns from 1024px give ~294px per column; below that the grid has 2 columns.
const NORMAL = '(min-width: 1264px) 294px, (min-width: 1024px) 25vw, 50vw';
const WIDE = '(min-width: 1264px) 596px, (min-width: 1024px) 50vw, 100vw';
const HALF_ROW = '(min-width: 1264px) 596px, 50vw';
const FULL_ROW = '(min-width: 1264px) 1200px, 100vw';

export function gallerySizesFor({ desktop, mobile }: GalleryTileSpan): string {
  if (desktop === 4) return FULL_ROW;
  if (desktop === 2) return mobile === 2 ? WIDE : HALF_ROW;
  return NORMAL;
}
