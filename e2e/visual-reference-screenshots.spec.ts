/// <reference lib="dom" />
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';
import { VISUALS_DIR } from './support/env';

const SEEDED_SLUGS = ['dramatic', 'mesh-84'] as const;
const WIDTHS = [1440, 390] as const;

/** Waits until images, webfonts and connector paths (measured after load) have settled. */
async function waitForSettled(page: Page): Promise<void> {
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}

for (const slug of SEEDED_SLUGS) {
  for (const width of WIDTHS) {
    test(`screenshot /look/${slug} at ${width}px`, async ({ page }) => {
      fs.mkdirSync(VISUALS_DIR, { recursive: true });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/look/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await waitForSettled(page);

      await page.screenshot({
        path: path.join(VISUALS_DIR, `e2e-${slug}-${width}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}
