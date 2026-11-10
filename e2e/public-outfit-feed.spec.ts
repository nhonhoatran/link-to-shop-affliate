/// <reference lib="dom" />
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { adminApi } from './support/admin-api';
import { CONTENT_SLUG_PREFIX, addOutfitsToCollection, createCollection, createPublishedOutfit, uploadMedia } from './support/collection-fixtures';
import { FEED_NEXT_LINK, FEED_SLIDE, scrollFeedToEnd, serverSlideCount, slideTops } from './support/feed-helpers';

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 860 },
] as const;
const FEED_PATHS = ['/', '/looks'] as const;
const NEXT_BUTTON = 'Outfit kế tiếp';
const PREVIOUS_BUTTON = 'Outfit trước';
// Keeps the collection fixture's text apart from the seeded data.
const stamp = Date.now().toString(36);
const COLLECTION_NAME = `E2E Feed Set ${stamp}`;
const COLLECTION_SLUG = `${CONTENT_SLUG_PREFIX}feed-set-${stamp}`;
const COLLECTION_DESCRIPTION = `Mô tả bộ sưu tập e2e ${stamp}`;
const OUTFIT_SLUG = `${CONTENT_SLUG_PREFIX}feed-look-${stamp}`;
const OUTFIT_TITLE = `E2E Feed Look ${stamp}`;

/** Index of the slide nearest to the scroll position, and how far the scroll sits from that slide's top. */
async function feedPosition(page: Page): Promise<{ index: number; offset: number }> {
  return page.locator('[data-feed]').evaluate((scroller) => {
    const origin = scroller.getBoundingClientRect().top - scroller.scrollTop;
    const tops = Array.from(scroller.querySelectorAll('[data-feed-slide]')).map((slide) => slide.getBoundingClientRect().top - origin);
    let index = 0;
    tops.forEach((top, i) => {
      if (Math.abs(top - scroller.scrollTop) < Math.abs(tops[index]! - scroller.scrollTop)) index = i;
    });
    return { index, offset: scroller.scrollTop - tops[index]! };
  });
}

/** Resolves to the slide index once the feed has come to rest on a slide. */
const settledIndex = async (page: Page): Promise<number | null> => {
  const { index, offset } = await feedPosition(page);
  return Math.abs(offset) <= 2 ? index : null;
};

for (const viewport of VIEWPORTS) {
  test(`first outfit fits the ${viewport.width}x${viewport.height} viewport on each feed page`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const path of FEED_PATHS) {
      await page.goto(path);
      const lookbook = page.locator(FEED_SLIDE).first().locator('[data-lookbook]');
      await expect(lookbook, path).toBeVisible();
      const box = await lookbook.boundingBox();
      expect(box, `${path}: lookbook box`).not.toBeNull();
      expect(box!.y + box!.height, `${path}: lookbook bottom past the viewport`).toBeLessThanOrEqual(viewport.height);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path}: horizontal page scroll in px`).toBeLessThanOrEqual(0);
    }
  });
}

test.describe('stepping through outfits', () => {
  test.use({ viewport: { width: 1440, height: 860 } });

  test('the down button moves exactly one outfit, and up goes back', async ({ page }) => {
    await page.goto('/');
    expect((await slideTops(page)).length, 'needs at least 2 outfits on the feed').toBeGreaterThanOrEqual(2);
    await expect(page.getByRole('button', { name: PREVIOUS_BUTTON, exact: true })).toBeDisabled();

    await page.getByRole('button', { name: NEXT_BUTTON, exact: true }).click();
    await expect.poll(() => settledIndex(page)).toBe(1);

    await page.getByRole('button', { name: PREVIOUS_BUTTON, exact: true }).click();
    await expect.poll(() => settledIndex(page)).toBe(0);
  });

  test('ArrowDown and ArrowUp move one outfit at a time', async ({ page }) => {
    await page.goto('/');
    const count = (await slideTops(page)).length;
    expect(count, 'needs at least 3 outfits on the feed').toBeGreaterThanOrEqual(3);

    await page.locator('[data-feed]').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => settledIndex(page)).toBe(1);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => settledIndex(page)).toBe(2);
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => settledIndex(page)).toBe(1);
  });
});

test('scrolling to the end loads the rest of the feed', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  const firstBatch = serverSlideCount(html);
  const hasNextBatch = html.includes('rel="next"');
  expect(firstBatch, 'server HTML carries the first batch').toBeGreaterThanOrEqual(1);

  await page.goto('/');
  await scrollFeedToEnd(page);
  if (hasNextBatch) {
    await expect.poll(() => page.locator(FEED_SLIDE).count()).toBeGreaterThan(firstBatch);
  }
  await expect(page.locator(FEED_NEXT_LINK)).toHaveCount(0);
  await expect(page.locator('[data-feed] footer')).toBeVisible();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const path of FEED_PATHS) {
    test(`${path} shows the first batch and a next-page link when more outfits exist`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator(FEED_SLIDE).first()).toBeAttached();
      const next = page.locator(FEED_NEXT_LINK);
      if ((await next.count()) > 0) {
        await expect(next).toHaveAttribute('href', `${path}?page=2`);
        await expect(next).toHaveText('Xem tiếp');
      } else {
        await expect(page.locator('[data-feed] footer')).toHaveCount(1);
      }
    });
  }
});

test.describe('collection page', () => {
  let api: APIRequestContext;
  let outfitId = '';
  let collectionId = '';

  test.beforeAll(async () => {
    api = await adminApi();
    outfitId = await createPublishedOutfit(api, OUTFIT_SLUG, OUTFIT_TITLE);
    collectionId = await createCollection(api, {
      slug: COLLECTION_SLUG,
      name: COLLECTION_NAME,
      status: 'published',
      coverImage: await uploadMedia(api, 'model'),
      description: COLLECTION_DESCRIPTION,
    });
    await addOutfitsToCollection(api, collectionId, [outfitId]);
  });

  test.afterAll(async () => {
    const collection = await api.delete(`/api/admin/collections/${collectionId}`);
    expect([200, 204, 404]).toContain(collection.status());
    const outfit = await api.delete(`/api/admin/outfits/${outfitId}`);
    expect([200, 204, 404]).toContain(outfit.status());
    await api.dispose();
  });

  test('shows its outfits in the feed but no cover image or description', async ({ page }) => {
    await expect
      .poll(async () => (await page.request.get(`/collections/${COLLECTION_SLUG}`)).status(), { timeout: 15_000, intervals: [500, 1_000] })
      .toBe(200);
    await page.goto(`/collections/${COLLECTION_SLUG}`);

    await expect(page.locator(`[data-feed] a[href="/look/${OUTFIT_SLUG}"]`)).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: COLLECTION_NAME, exact: true })).toBeAttached();
    await expect(page.getByAltText(`Ảnh bìa bộ sưu tập ${COLLECTION_NAME}`)).toHaveCount(0);
    await expect(page.getByText(COLLECTION_DESCRIPTION)).toHaveCount(0);
  });
});
