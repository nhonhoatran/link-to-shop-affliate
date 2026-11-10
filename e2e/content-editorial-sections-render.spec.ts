import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { adminApi } from './support/admin-api';
import { CONTENT_SLUG_PREFIX, addOutfitsToCollection, createCollection, createPublishedOutfit, deleteContentFixtures, uploadMedia } from './support/collection-fixtures';
import { publishLayout, resetHome } from './support/home-layout';
import { EDITORIAL_SECTION_IDS, editorialLayout } from './support/editorial-home-layout';
import { saveConsent } from './support/newsletter-fixtures';
import { restoreSettings, updateSettings, type SettingsDocument } from './support/admin-settings';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const OUTFIT_TITLES = [`E2E Editorial A ${stamp}`, `E2E Editorial B ${stamp}`, `E2E Editorial C ${stamp}`];
const HERO_HEADING = `Tiêu đề editorial ${stamp}`;
const FAQ_TITLE = `Hỏi đáp editorial ${stamp}`;
const CTA_HREF = '/looks';
const VIEWPORTS = [320, 390, 768, 1024, 1440];

let api: APIRequestContext;
let previousSettings: SettingsDocument;
let outfitSlugs: string[] = [];

test.beforeAll(async () => {
  // Home sections render on '/' only when homeMode is 'sections'; afterAll puts the original value back.
  previousSettings = await updateSettings({ homeMode: 'sections' });
  api = await adminApi();
  await deleteContentFixtures(api);
  const image = await uploadMedia(api, 'model');
  const outfitIds: string[] = [];
  outfitSlugs = OUTFIT_TITLES.map((_, i) => `${CONTENT_SLUG_PREFIX}editorial-${i}-${stamp}`);
  for (let i = 0; i < OUTFIT_TITLES.length; i += 1) {
    outfitIds.push(await createPublishedOutfit(api, outfitSlugs[i]!, OUTFIT_TITLES[i]!));
  }
  const collectionId = await createCollection(api, {
    slug: `${CONTENT_SLUG_PREFIX}editorial-set-${stamp}`,
    name: `E2E Editorial Set ${stamp}`,
    status: 'published',
    coverImage: image,
  });
  await addOutfitsToCollection(api, collectionId, outfitIds);
  await saveConsent();
  await publishLayout(
    api,
    editorialLayout(image, [outfitIds[0]!, outfitIds[1]!, outfitIds[2]!], [collectionId], { hero: HERO_HEADING, faq: FAQ_TITLE }),
  );
});

test.afterAll(async () => {
  await restoreSettings(previousSettings);
  await resetHome(api);
  await deleteContentFixtures(api);
  await api.dispose();
});

async function sectionIds(page: Page): Promise<string[]> {
  return page.locator('[data-section-id]').evaluateAll((els) => els.map((el) => el.getAttribute('data-section-id') ?? ''));
}

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
}

test('all eleven section types render in layout order with one h1', async ({ page }) => {
  await expect
    .poll(async () => (await page.request.get('/')).text(), { timeout: 15_000, intervals: [500, 1_000] })
    .toContain(FAQ_TITLE);
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  expect(await sectionIds(page)).toEqual([...EDITORIAL_SECTION_IDS]);
});

test('the marquee moves and pauses while hovered', async ({ page }) => {
  await page.goto('/');
  const marquee = page.locator('[data-section-id="e2e-marquee"]');
  // The animation sits on the track, the parent of the item lists.
  const track = marquee.locator('ul').first().locator('xpath=..');
  await expect(track).toBeVisible();
  await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationName)).not.toBe('none');
  await expect(marquee.locator('button, input, label')).toHaveCount(0);

  // The track never holds still, so Playwright cannot stabilise it for a hover; hover the static .marquee wrapper instead.
  await track.locator('xpath=../..').hover();
  await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused');
  await page.mouse.move(0, 0);
  await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('running');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the marquee track has no animation', async ({ page }) => {
    await page.goto('/');
    const track = page.locator('[data-section-id="e2e-marquee"] ul').first().locator('xpath=..');
    await expect.poll(() => track.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});

test('the gallery links to each look and has no empty tile', async ({ page }) => {
  await page.goto('/');
  const gallery = page.locator('[data-section-id="e2e-gallery"]');
  const tiles = gallery.locator('a[href^="/look/"]');
  await expect(tiles).toHaveCount(OUTFIT_TITLES.length);
  for (const slug of outfitSlugs) {
    await expect(gallery.locator(`a[href="/look/${slug}"]`)).toHaveCount(1);
  }
  const sizes = await tiles.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width * el.getBoundingClientRect().height));
  for (const area of sizes) expect(area, 'gallery tile area').toBeGreaterThan(0);
});

test('the campaign banner shows its heading and CTA', async ({ page }) => {
  await page.goto('/');
  const banner = page.locator('[data-section-id="e2e-campaign"]');
  await expect(banner.getByRole('heading', { level: 2, name: 'Banner chiến dịch', exact: true })).toBeVisible();
  await expect(banner.getByRole('link', { name: 'Xem ngay', exact: true })).toHaveAttribute('href', CTA_HREF);
});

// Plain images get <link rel=preload>; the art-directed hero <picture> keeps fetchPriority instead (plan decision 5).
// Together they must give exactly one LCP hint.
test('the home page has exactly one LCP image hint, preload or fetchPriority', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-section-id="e2e-hero"]')).toBeVisible();
  const preloads = await page.locator('link[rel="preload"][as="image"]').count();
  const highPriority = await page.locator('img[fetchpriority="high"]').count();
  expect(preloads + highPriority).toBe(1);
});

test('no horizontal scroll from 320px to 1440px', async ({ page }) => {
  await page.goto('/');
  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalScroll(page);
  }
});

test('every section stays readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: 'vi-VN', baseURL: test.info().project.use.baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: 'Banner chiến dịch', exact: true })).toBeVisible();
    await expect(page.locator('[data-section-id="e2e-gallery"] a[href^="/look/"]')).toHaveCount(OUTFIT_TITLES.length);
    await expect(page.getByRole('heading', { level: 2, name: 'Thư viện e2e', exact: true })).toBeVisible();
    await expect(page.locator('form:has(input[name="consentTextVersion"])')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('default layout: the gallery skips outfits the outfit list already shows', async ({ page }) => {
  await resetHome(api);
  await expect
    .poll(async () => (await page.request.get('/')).text(), { timeout: 15_000, intervals: [500, 1_000] })
    .toContain('Nhận tin mới');
  await page.goto('/');
  const hrefs = (section: string) =>
    page.locator(`[data-section-id="${section}"] a[href^="/look/"]`).evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''));
  const listed = new Set(await hrefs('default-outfit-list'));
  const gallery = await hrefs('default-gallery');
  expect(gallery.filter((href) => listed.has(href)), 'looks shown by both sections').toEqual([]);
});
