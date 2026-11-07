/// <reference lib="dom" />
import { test, expect } from '@playwright/test';
import { measureHotspotOffsets } from './support/hotspot-offsets';

const SLUGS = ['dramatic', 'mesh-84'];
const WIDTHS = [1440, 390];
const TOLERANCE_PX = 2;

// Anchors are stored as % of the model image, so each hotspot centre must land on that spot of the rendered image.
for (const slug of SLUGS) {
  for (const width of WIDTHS) {
    test(`hotspots sit on their anchor of the model image: ${slug} @${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/look/${slug}`);
      const offsets = await measureHotspotOffsets(page);
      expect(offsets.hotspots.length).toBeGreaterThan(0);
      expect(offsets.heightGap).toBeLessThanOrEqual(TOLERANCE_PX);
      for (const offset of offsets.hotspots) expect(offset).toBeLessThanOrEqual(TOLERANCE_PX);
    });
  }
}
