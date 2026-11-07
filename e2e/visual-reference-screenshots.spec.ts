/// <reference lib="dom" />
import { test, expect, type Page } from '@playwright/test';

const SEEDED_SLUGS = ['dramatic', 'mesh-84'] as const;
const WIDTHS = [1440, 390] as const;

/** Waits until images, webfonts and connector paths (measured after load) have settled. */
async function waitForSettled(page: Page): Promise<void> {
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.evaluate(() => document.fonts.ready);
  // Dev-only Next.js indicator (fixed, bottom-left, animated) would otherwise be captured over the element.
  await page.evaluate(() => document.querySelectorAll('nextjs-portal').forEach((node) => node.remove()));
  await page.waitForTimeout(300);
}

for (const slug of SEEDED_SLUGS) {
  for (const width of WIDTHS) {
    test(`screenshot /look/${slug} at ${width}px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/look/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await waitForSettled(page);

      await expect(page.locator('[data-lookbook]')).toHaveScreenshot(`lookbook-${slug}-${width}.png`, {
        animations: 'disabled',
        maxDiffPixelRatio: 0.002,
      });
    });
  }
}
