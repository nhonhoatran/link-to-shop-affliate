/// <reference lib="dom" />
import { test, expect } from '@playwright/test';
import { readOutfitState } from './support/outfit-state';

const VIEWPORTS = [320, 390, 768, 1024, 1440] as const;
const PHONE_WIDTHS = [320, 390] as const;
const MIN_TAP_PX = 44;

for (const width of VIEWPORTS) {
  test(`no horizontal scroll at ${width}px on home, list and look pages`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const paths = ['/', '/looks', `/look/${readOutfitState().slug}`];
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(metrics.scrollWidth, `${path} at ${width}px: horizontal overflow`).toBeLessThanOrEqual(metrics.innerWidth);
    }
  });

  test(`header links stay inside the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/looks');
    // Exact count is not asserted: the "Bộ sưu tập" nav link appears whenever a collection is published
    // (settings absent = shown), so the number depends on the data. Every link must still fit the viewport.
    const links = page.getByRole('banner').getByRole('link');
    await expect(links.first()).toBeVisible();
    expect(await links.count()).toBeGreaterThanOrEqual(3);
    const boxes = await links.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
    for (const box of boxes) {
      expect(box.x, "link left edge").toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, 'link right edge').toBeLessThanOrEqual(width);
    }
  });
}

for (const width of PHONE_WIDTHS) {
  test(`header navigation links are at least ${MIN_TAP_PX}px tall at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/looks');
    // The fixed items are always there; the collections link is optional (see the header test above).
    const navLinks = page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link');
    await expect(navLinks.filter({ hasText: 'Trang chủ' })).toHaveCount(1);
    await expect(navLinks.filter({ hasText: 'Tất cả outfit' })).toHaveCount(1);
    const heights = await navLinks.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(MIN_TAP_PX);
  });
}
