/// <reference lib="dom" />
import { test, expect, type Page } from '@playwright/test';
import { readOutfitState } from './support/outfit-state';

const VIEWPORTS = [390, 320];

interface LayoutMetrics {
  scrollWidth: number;
  innerWidth: number;
  minFontSize: number;
  tooSmall: string[];
}

/** Measures every rendered text node: its font size, and whether the document overflows horizontally. */
async function measureLayout(page: Page): Promise<LayoutMetrics> {
  return page.evaluate(() => {
    const tooSmall: string[] = [];
    let minFontSize = Number.POSITIVE_INFINITY;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? '';
      const el = node.parentElement;
      if (!text || !el) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) continue;
      const size = Number.parseFloat(style.fontSize);
      minFontSize = Math.min(minFontSize, size);
      if (size < 11) tooSmall.push(`${el.tagName.toLowerCase()} ${size}px "${text.slice(0, 40)}"`);
    }
    return {
      scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
      innerWidth: window.innerWidth,
      minFontSize,
      tooSmall,
    };
  });
}

for (const width of VIEWPORTS) {
  test(`mobile ${width}px: outfit and seeded page have no horizontal overflow and text is at least 11px`, async ({
    page,
  }) => {
    const state = readOutfitState();
    await page.setViewportSize({ width, height: 844 });

    for (const slug of [state.slug, 'dramatic']) {
      await page.goto(`/look/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForFunction(() => [...document.images].every((img) => img.complete));

      const metrics = await measureLayout(page);
      expect(metrics.scrollWidth, `${slug}: horizontal overflow`).toBeLessThanOrEqual(metrics.innerWidth);
      expect(metrics.tooSmall, `${slug}: text under 11px`).toEqual([]);
      expect(metrics.minFontSize, `${slug}: min font size`).toBeGreaterThanOrEqual(11);
    }
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('names, descriptions and affiliate links are readable and clickable', async ({ page }) => {
    const state = readOutfitState();
    await page.goto(`/look/${state.slug}`);
    await expect(page.getByRole('heading', { level: 1, name: state.title, exact: true })).toBeVisible();

    for (const item of state.items) {
      await expect(page.getByRole('heading', { level: 2, name: item.name, exact: true })).toBeVisible();
      await expect(page.getByText(item.description, { exact: true })).toBeVisible();
      const card = page.locator(`a[href="${item.url}"]:not([data-hotspot])`);
      await expect(card).toHaveCount(1);
      await expect(card).toHaveAttribute('target', '_blank');
      await expect(card).not.toHaveAttribute('aria-disabled');
    }
    await expect(page.locator('a[data-hotspot][href^="https://"]')).toHaveCount(state.items.length);
  });

  test('a seeded outfit without links still renders its heading and item names', async ({ page }) => {
    await page.goto('/look/dramatic');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
  });
});

test('unknown slug returns 404 with the not-found message', async ({ page }) => {
  const response = await page.goto('/look/no-such-outfit-e2e');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
});
