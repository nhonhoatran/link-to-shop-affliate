/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { MAX_DOTS, firstSlide, firstTrack, photoIndex, swipeLeft } from './support/feed-photo-helpers';

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 860 },
] as const;

// /looks always renders the feed, whatever the home page mode is set to.
test.describe('photo posts', () => {
  test.describe('mobile 390x844', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test('a swipe moves the track to the next photo and the dots follow', async ({ page }) => {
      await page.goto('/looks');
      const track = firstTrack(page);
      const total = await track.locator(':scope > li').count();
      expect(total, 'photos on the first outfit').toBeGreaterThanOrEqual(2);
      await expect.poll(() => photoIndex(track)).toBe(0);

      await swipeLeft(page, track);
      await expect.poll(() => photoIndex(track)).toBe(1);
      if (total <= MAX_DOTS) {
        await expect(firstSlide(page).getByRole('button', { name: `Ảnh 2/${total}` })).toHaveAttribute('aria-current', 'true');
      } else {
        await expect(firstSlide(page).getByText(`2/${total}`, { exact: true })).toBeVisible();
      }
    });

    test('"Mua đồ" lists every item with sponsored links in new tabs, and Esc closes it', async ({ page }) => {
      await page.goto('/looks');
      const shop = firstSlide(page).getByRole('button', { name: /^Mua đồ trong outfit/ });
      const itemCount = Number((await shop.getAttribute('aria-label'))?.match(/\((\d+) món\)/)?.[1]);
      expect(itemCount, 'item count in the Mua đồ label').toBeGreaterThan(0);

      await shop.click();
      const sheet = page.locator('dialog[open]');
      await expect(sheet).toBeVisible();
      const buyLinks = sheet.getByRole('link', { name: /^Mua ngay / });
      await expect(buyLinks).toHaveCount(itemCount);
      for (const link of await buyLinks.all()) {
        await expect(link).toHaveAttribute('target', '_blank');
        await expect(link).toHaveAttribute('rel', /sponsored/);
      }

      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[open]')).toHaveCount(0);
      await expect(shop).toBeFocused();
    });
  });

  test.describe('desktop 1440x860', () => {
    test.use({ viewport: { width: 1440, height: 860 } });

    test('the next arrow and ArrowRight/ArrowLeft move the track one photo at a time', async ({ page }) => {
      await page.goto('/looks');
      const track = firstTrack(page);
      await expect.poll(() => photoIndex(track)).toBe(0);

      await firstSlide(page).getByRole('button', { name: 'Ảnh kế tiếp' }).click();
      await expect.poll(() => photoIndex(track)).toBe(1);

      await page.locator('[data-feed]').focus();
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => photoIndex(track)).toBe(2);
      await page.keyboard.press('ArrowLeft');
      await expect.poll(() => photoIndex(track)).toBe(1);
    });
  });

  for (const viewport of VIEWPORTS) {
    test(`an item link on the lookbook photo is clickable at ${viewport.width}px, not under the caption`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/looks');
      const card = firstTrack(page).locator(':scope > li').first().locator('a[data-item-id]:not([data-hotspot])').first();
      await expect(card, 'an item card on the lookbook photo').toBeAttached();
      await card.scrollIntoViewIfNeeded();

      const hit = await card.evaluate((el) => {
        const box = el.getBoundingClientRect();
        return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('a')?.getAttribute('data-item-id') ?? null;
      });
      expect(hit).toBe(await card.getAttribute('data-item-id'));
    });
  }
});
