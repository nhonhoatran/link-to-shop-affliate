import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { adminApi } from './support/admin-api';
import { CONTENT_SLUG_PREFIX, addOutfitsToCollection, createCollection, createPublishedOutfit, deleteContentFixtures, uploadMedia } from './support/collection-fixtures';
import { publishLayout, resetHome, sevenTypeLayout } from './support/home-layout';
import { restoreSettings, updateSettings, type SettingsDocument } from './support/admin-settings';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
// Must match the label in sevenTypeLayout (support/home-layout.ts).
const HERO_LABEL = 'Banner e2e';
const HERO_HEADING = `Tiêu đề banner ${stamp}`;
const FAQ_TITLE = `Hỏi đáp ${stamp}`;
const OUTFIT_TITLES = [`E2E Content Render A ${stamp}`, `E2E Content Render B ${stamp}`];
const COLLECTION_NAMES = [`E2E Content Render Set A ${stamp}`, `E2E Content Render Set B ${stamp}`];
const VIEWPORTS = [320, 390, 768, 1024, 1440];

let api: APIRequestContext;
let previousSettings: SettingsDocument;

test.beforeAll(async () => {
  // Home sections render on '/' only when homeMode is 'sections'; afterAll puts the original value back.
  previousSettings = await updateSettings({ homeMode: 'sections' });
  api = await adminApi();
  await deleteContentFixtures(api);
  const image = await uploadMedia(api, 'model');
  const outfitIds: string[] = [];
  for (let i = 0; i < OUTFIT_TITLES.length; i += 1) {
    outfitIds.push(await createPublishedOutfit(api, `${CONTENT_SLUG_PREFIX}render-${i}-${stamp}`, OUTFIT_TITLES[i]!));
  }
  const collectionIds: string[] = [];
  for (let i = 0; i < COLLECTION_NAMES.length; i += 1) {
    const id = await createCollection(api, {
      slug: `${CONTENT_SLUG_PREFIX}render-set-${i}-${stamp}`,
      name: COLLECTION_NAMES[i]!,
      status: 'published',
      coverImage: image,
    });
    await addOutfitsToCollection(api, id, [outfitIds[i]!]);
    collectionIds.push(id);
  }
  await publishLayout(api, sevenTypeLayout(image, outfitIds[0]!, collectionIds, { hero: HERO_HEADING, faq: FAQ_TITLE }));
});

test.afterAll(async () => {
  await restoreSettings(previousSettings);
  await resetHome(api);
  await deleteContentFixtures(api);
  await api.dispose();
});

// The scrolling track (not the section wrapper, which carries the same label) owns aria-live.
const heroTrack = (page: Page) => page.locator(`div[aria-live][aria-label="${HERO_LABEL}"]`);

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
}

test('the seven-type layout renders one h1, one section per block and a FAQPage JSON-LD', async ({ page }) => {
  await expect
    .poll(async () => (await page.request.get('/')).text(), { timeout: 15_000, intervals: [500, 1_000] })
    .toContain(FAQ_TITLE);
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('[data-section-id]')).toHaveCount(7);
  await expect(page.getByRole('heading', { level: 2, name: FAQ_TITLE, exact: true })).toBeVisible();

  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((text) => text.includes('"FAQPage"')), 'FAQPage JSON-LD').toBe(true);
});

test('the autoplay slider stops on hover and pauses for reduced motion', async ({ page }) => {
  await page.goto('/');
  // Autoplay runs when motion is allowed: the track announces nothing (aria-live off) while it moves.
  await expect(heroTrack(page)).toHaveAttribute('aria-live', 'off');

  await heroTrack(page).hover();
  await expect(heroTrack(page)).toHaveAttribute('aria-live', 'polite');
  await page.mouse.move(0, 0);
  await expect(heroTrack(page)).toHaveAttribute('aria-live', 'off');
  await expect(page.getByRole('button', { name: 'Tạm dừng tự chuyển', exact: true })).toHaveCount(0);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the slider does not autoplay', async ({ page }) => {
    await page.goto('/');
    await expect(heroTrack(page)).toHaveAttribute('aria-live', 'polite');
  });
});

test('the outfit tabs are radio buttons that switch the panel', async ({ page }) => {
  await page.goto('/');
  const radios = page.getByRole('radio');
  await expect(radios).toHaveCount(2);
  await radios.nth(1).check({ force: true });
  await expect(radios.nth(1)).toBeChecked();
  await expect(page.getByRole('heading', { level: 3, name: OUTFIT_TITLES[1], exact: true })).toBeVisible();
});

test('content stays readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, locale: 'vi-VN', baseURL: test.info().project.use.baseURL });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2, name: FAQ_TITLE, exact: true })).toBeVisible();
    // Answers sit in closed <details>, so they are in the HTML but hidden until opened: that is the intended FAQ behaviour.
    await expect(page.getByText('Giao hàng mất bao lâu?', { exact: true })).toBeVisible();
    await expect(page.getByText('Trong 2 đến 3 ngày.', { exact: true })).toBeAttached();
    await expect(page.getByText('Giao trong ngày ở nội thành.', { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('sections finish their reveal animation fully opaque', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() => page.locator('[data-section-id]').evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === '1')), {
      timeout: 5_000,
    })
    .toBe(true);
});

test('no horizontal scroll from 320px to 1440px', async ({ page }) => {
  await page.goto('/');
  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: 900 });
    await expectNoHorizontalScroll(page);
  }
});
