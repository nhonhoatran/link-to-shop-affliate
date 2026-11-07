/// <reference lib="dom" />
import { request as playwrightRequest, test, expect, type Page } from '@playwright/test';
import { setLooksPageSize } from './support/admin-settings';
import { readOutfitState } from './support/outfit-state';

const HEADER_NAV = 'Điều hướng chính';
const FOOTER_NAV = 'Điều hướng chân trang';
const LOOKS_LINK = 'Tất cả outfit';

const headerNav = (page: Page) => page.getByRole('navigation', { name: HEADER_NAV });

/** Vertical offset of the sticky header in px; 0 when shown, negative when hidden on scroll. */
const headerOffsetY = (page: Page) =>
  page.getByRole('banner').evaluate((el) => {
    const transform = getComputedStyle(el).transform;
    return transform === 'none' ? 0 : new DOMMatrix(transform).m42;
  });

test.describe('/looks pagination', () => {
  // Dev data has 2-3 published outfits; a page size of 1 makes several pages without creating more data.
  let previousPageSize: number | undefined;

  test.beforeAll(async () => {
    previousPageSize = await setLooksPageSize(1);
    // Next applies revalidateTag after it has answered the revalidate call, so /looks can serve the old page size for a few hundred ms.
    const web = await playwrightRequest.newContext({ baseURL: test.info().project.use.baseURL });
    try {
      await expect
        .poll(async () => (await web.get('/looks')).text(), { timeout: 10_000, intervals: [100] })
        .toContain('Trang 2');
    } finally {
      await web.dispose();
    }
  });

  test.afterAll(async () => {
    await setLooksPageSize(previousPageSize);
  });

  test('page 2 shows the next outfit and marks its number as current', async ({ page }) => {
    await page.goto('/looks?page=2');
    await expect(page.getByRole('heading', { level: 1, name: 'Tất cả outfit', exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Phân trang' }).getByRole('link', { name: 'Trang 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('a[href^="/look/"]')).toHaveCount(1);
  });

  test('previous and next links move between pages', async ({ page }) => {
    await page.goto('/looks?page=1');
    await page.getByRole('link', { name: 'Sau', exact: true }).click();
    await expect(page).toHaveURL(/\/looks\?page=2$/);
    await page.getByRole('link', { name: 'Trước', exact: true }).click();
    await expect(page).toHaveURL(/\/looks(\?page=1)?$/);
  });

  test('invalid page values fall back to page 1', async ({ page }) => {
    for (const raw of ['abc', '0', '-1', '1.5']) {
      const response = await page.goto(`/looks?page=${raw}`);
      expect(response?.status(), `status for page=${raw}`).toBe(200);
      await expect(page.getByRole('link', { name: 'Trang 1' }), `page=${raw}`).toHaveAttribute('aria-current', 'page');
    }
  });

  test('a page beyond the last one returns 404', async ({ page }) => {
    const response = await page.goto('/looks?page=999');
    expect(response?.status()).toBe(404);
  });
});

test.describe('404 pages render a single shell', () => {
  for (const path of ['/nope', '/look/no-such-outfit-e2e', '/looks?page=999']) {
    test(`${path} has one main, header and footer`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('header')).toHaveCount(1);
      await expect(page.locator('footer')).toHaveCount(1);
    });
  }
});

test.describe('public navigation', () => {
  test('header link opens the full outfit list', async ({ page }) => {
    await page.goto(`/look/${readOutfitState().slug}`);
    await headerNav(page).getByRole('link', { name: LOOKS_LINK, exact: true }).click();
    await expect(page).toHaveURL(/\/looks$/);
    await expect(headerNav(page).getByRole('link', { name: LOOKS_LINK, exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('footer link opens the full outfit list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: FOOTER_NAV }).getByRole('link', { name: LOOKS_LINK, exact: true }).click();
    await expect(page).toHaveURL(/\/looks$/);
  });

  test('breadcrumb walks back to home and to the list', async ({ page }) => {
    const state = readOutfitState();
    await page.goto(`/look/${state.slug}`);
    const breadcrumb = page.getByRole('navigation', { name: 'Đường dẫn trang' });
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(state.title);

    await breadcrumb.getByRole('link', { name: LOOKS_LINK, exact: true }).click();
    await expect(page).toHaveURL(/\/looks$/);

    await page.goto(`/look/${state.slug}`);
    await page.getByRole('navigation', { name: 'Đường dẫn trang' }).getByRole('link', { name: 'Trang chủ', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('clicking an outfit card opens its look page', async ({ page }) => {
    await page.goto('/looks');
    await page.locator('a[href^="/look/"]').first().click();
    await expect(page).toHaveURL(/\/look\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('related outfits never include the outfit being viewed', async ({ page }) => {
    const state = readOutfitState();
    await page.goto(`/look/${state.slug}`);
    const related = page.getByRole('region', { name: 'Outfit khác' });
    await expect(related).toBeVisible();
    const hrefs = await related.locator('a[href^="/look/"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs).not.toContain(`/look/${state.slug}`);
  });
});

test.describe('header hides on scroll down and returns on scroll up', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('hides after scrolling down, shows again after scrolling up', async ({ page }) => {
    await page.goto('/look/dramatic');
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
    await expect.poll(() => headerOffsetY(page)).toBe(0);

    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => headerOffsetY(page)).toBeLessThan(0);

    await page.mouse.wheel(0, -300);
    await expect.poll(() => headerOffsetY(page)).toBe(0);
  });

  test('keyboard focus on a header link shows the header again', async ({ page }) => {
    await page.goto('/look/dramatic');
    await page.mouse.move(720, 450);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => headerOffsetY(page)).toBeLessThan(0);

    const header = page.getByRole('banner');
    for (let press = 0; press < 6; press += 1) {
      await page.keyboard.press('Tab');
      if (await header.evaluate((el) => el.contains(document.activeElement))) break;
    }
    await expect(header.evaluate((el) => el.contains(document.activeElement))).resolves.toBe(true);
    await expect.poll(() => headerOffsetY(page)).toBe(0);
  });
});
