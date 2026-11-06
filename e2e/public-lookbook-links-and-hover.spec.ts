/// <reference lib="dom" />
import { test, expect, type Locator, type Page } from '@playwright/test';
import { readOutfitState, type E2EOutfitItem } from './support/outfit-state';

const cardOf = (page: Page, item: E2EOutfitItem): Locator =>
  page
    .locator('a[data-item-id]:not([data-hotspot])')
    .filter({ has: page.getByRole('heading', { level: 2, name: item.name, exact: true }) });

const hotspotOf = (page: Page, item: E2EOutfitItem): Locator =>
  page.getByRole('link', { name: item.name, exact: true });

const connectorOf = (page: Page, itemId: string): Locator => page.locator(`path[data-item-id="${itemId}"]`);

test.describe('published outfit: links', () => {
  test('each item image, name and hotspot points at its affiliate URL', async ({ page }) => {
    const state = readOutfitState();
    await page.goto(`/look/${state.slug}`);

    for (const item of state.items) {
      const card = cardOf(page, item);
      await expect(card, `card for ${item.name}`).toHaveCount(1);
      await expect(card).toHaveAttribute('href', item.url);
      await expect(card).toHaveAttribute('target', '_blank');
      await expect(card).toHaveAttribute('rel', /sponsored/);

      const image = card.locator('img');
      await expect(image).toHaveAttribute('alt', item.name);
      await expect
        .poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
        .toBe(true);

      const hotspot = hotspotOf(page, item);
      await expect(hotspot, `hotspot for ${item.name}`).toHaveCount(1);
      await expect(hotspot).toHaveAttribute('href', item.url);
      await expect(hotspot).toHaveAttribute('target', '_blank');
      await expect(hotspot).toHaveAttribute('rel', /sponsored/);
      await expect(hotspot).toHaveAttribute('data-hotspot', 'true');

      expect(await card.getAttribute('data-item-id')).toBe(await hotspot.getAttribute('data-item-id'));
    }
  });
});

test.describe('published outfit: hover linking', () => {
  test('hovering a card or a hotspot highlights both, dims the rest, and clears on leave', async ({ page }) => {
    const state = readOutfitState();
    await page.goto(`/look/${state.slug}`);
    const root = page.locator('[data-lookbook]');
    const [first, second] = state.items;
    const card = cardOf(page, first!);
    const hotspot = hotspotOf(page, first!);
    const itemId = (await card.getAttribute('data-item-id'))!;
    const otherCard = cardOf(page, second!);

    await card.hover();
    await expect(root).toHaveAttribute('data-active-id', itemId);
    await expect(card).toHaveAttribute('data-active', '');
    await expect(hotspot).toHaveAttribute('data-active', '');
    await expect(connectorOf(page, itemId)).toHaveAttribute('data-active', '');
    await expect(otherCard).not.toHaveAttribute('data-active', '');
    await expect
      .poll(() => otherCard.evaluate((el) => Number(getComputedStyle(el).opacity)))
      .toBeLessThan(1);

    await page.mouse.move(0, 0);
    await expect(root).not.toHaveAttribute('data-active-id');
    await expect(hotspot).not.toHaveAttribute('data-active', '');

    await hotspot.hover();
    await expect(root).toHaveAttribute('data-active-id', itemId);
    await expect(card).toHaveAttribute('data-active', '');
    await expect(connectorOf(page, itemId)).toHaveAttribute('data-active', '');
  });
});
