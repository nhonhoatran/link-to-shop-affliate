/// <reference lib="dom" />
import { test, expect, type Page } from '@playwright/test';
import { measureHotspotOffsets } from './support/hotspot-offsets';
import { readOutfitState } from './support/outfit-state';

const TOLERANCE_PX = 2;

declare global {
  interface Window {
    __connectorDrawStarts: number;
  }
}

/** Connector draw animations still running or queued on the lookbook threads. */
const pendingPathAnimations = (page: Page) =>
  page.evaluate(
    () =>
      document
        .getAnimations()
        .filter(
          (a) =>
            (a.effect as KeyframeEffect | null)?.target instanceof SVGPathElement &&
            a.timeline instanceof DocumentTimeline &&
            (a.playState === 'running' || a.pending),
        ).length,
  );

test('connector threads draw once on load and do not redraw after a resize', async ({ page }) => {
  // Counts draw animations started on connector paths, including the first draw on load.
  await page.addInitScript(() => {
    window.__connectorDrawStarts = 0;
    document.addEventListener(
      'animationstart',
      (event) => {
        if (event.target instanceof SVGPathElement) window.__connectorDrawStarts += 1;
      },
      true,
    );
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/look/${readOutfitState().slug}`);
  await expect(page.locator('[data-lookbook] svg[data-ready]')).toHaveCount(1);
  await expect.poll(() => pendingPathAnimations(page)).toBe(0);

  const startsAfterDraw = await page.evaluate(() => window.__connectorDrawStarts);
  expect(startsAfterDraw, 'connectors drawn on load').toBeGreaterThan(0);

  const pathCount = await page.locator('[data-lookbook] path[data-item-id]').count();
  expect(pathCount, 'connector paths').toBeGreaterThan(0);

  await page.setViewportSize({ width: 1024, height: 900 });
  // Two frames: the ResizeObserver re-measure runs before the first paint after the resize.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  await expect.poll(() => pendingPathAnimations(page)).toBe(0);
  expect(await page.evaluate(() => window.__connectorDrawStarts), 'no redraw after resize').toBe(startsAfterDraw);
  await expect(page.locator('[data-lookbook] svg[data-ready]')).toHaveCount(1);

  const offsets = await measureHotspotOffsets(page);
  expect(offsets.hotspots.length).toBeGreaterThan(0);
  expect(offsets.heightGap).toBeLessThanOrEqual(TOLERANCE_PX);
  for (const offset of offsets.hotspots) expect(offset).toBeLessThanOrEqual(TOLERANCE_PX);
});
