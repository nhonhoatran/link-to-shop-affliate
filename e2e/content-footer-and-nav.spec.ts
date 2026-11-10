import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { adminApi, signInContext } from './support/admin-api';
import { restoreSettings, updateSettings, type SettingsDocument } from './support/admin-settings';
import { scrollFeedToEnd } from './support/feed-helpers';
import { CONTENT_SLUG_PREFIX, createPublishedOutfit, deleteContentFixtures } from './support/collection-fixtures';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const FOOTER_LINK_LABEL = `E2E Footer ${stamp}`;
const ANNOUNCEMENT_TEXT = 'Thông báo e2e: miễn phí vận chuyển cho đơn từ 300.000đ, đổi trả trong 7 ngày, hỗ trợ tư vấn mỗi ngày từ sáng đến tối. '
  .repeat(2)
  .slice(0, 160)
  .trim();
const ANNOUNCEMENT_LINK = 'Xem bộ sưu tập';
const OUTFIT_SLUG = `${CONTENT_SLUG_PREFIX}footer-${stamp}`;
const PUBLIC_PATHS = ['/', '/looks', `/look/${OUTFIT_SLUG}`, '/nope-e2e-footer'];

let api: APIRequestContext;
let before: SettingsDocument;

test.beforeAll(async () => {
  api = await adminApi();
  await deleteContentFixtures(api);
  await createPublishedOutfit(api, OUTFIT_SLUG, `E2E Content Footer Look ${stamp}`);
  // Start from an empty footer so the first column is the one this spec adds; afterAll puts the original back.
  before = await updateSettings({ footer: { columns: [], social: [] } });
});

test.afterAll(async () => {
  await restoreSettings(before);
  await deleteContentFixtures(api);
  await api.dispose();
});

const footerLink = (page: Page, label: string) => page.getByRole('contentinfo').getByRole('link', { name: label, exact: true });

/** Saved settings reach the public pages after revalidation, so poll each page. */
async function expectPublicToContain(page: Page, path: string, text: string, present: boolean): Promise<void> {
  const matcher = expect.poll(async () => (await page.request.get(path)).text(), { timeout: 15_000, intervals: [500, 1_000] });
  if (present) await matcher.toContain(text);
  else await matcher.not.toContain(text);
}

async function saveSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
}

test('a footer column saved in settings shows on every public page', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/settings');
  await page.getByRole('button', { name: 'Thêm cột', exact: true }).click();
  await page.getByLabel('Tiêu đề cột', { exact: true }).fill('E2E Cột');
  // A new column starts with one empty link row (emptyColumn in settings-form-state.ts), so it is filled directly.
  await page.getByLabel('Chữ hiển thị', { exact: true }).fill(FOOTER_LINK_LABEL);
  await page.getByLabel('Đường dẫn', { exact: true }).fill('/collections');
  await saveSettings(page);

  // The feed renders its footer only after the last outfit, so '/' and '/looks' are checked in the browser after scrolling.
  for (const path of PUBLIC_PATHS.filter((item) => item !== '/' && item !== '/looks')) {
    await expectPublicToContain(page, path, FOOTER_LINK_LABEL, true);
  }
  for (const path of ['/', '/looks']) {
    // Settings reach the feed footer after revalidation, so reload and scroll until the new link shows.
    await expect
      .poll(
        async () => {
          await page.goto(path);
          await scrollFeedToEnd(page);
          return footerLink(page, FOOTER_LINK_LABEL).count();
        },
        { timeout: 30_000, intervals: [1_000, 2_000] },
      )
      .toBe(1);
    await expect(footerLink(page, FOOTER_LINK_LABEL), path).toHaveAttribute('href', '/collections');
  }
});

test('a javascript: link is refused on its field', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/settings');
  await page.getByLabel('Đường dẫn', { exact: true }).fill('javascript:alert(1)');
  await saveSettings(page);
  await expect(page.getByLabel('Đường dẫn', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expectPublicToContain(page, '/', 'javascript:alert', false);
});

test('an announcement bar shows above the header on every public page and skips first in tab order', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/settings');
  await page.getByLabel('Đường dẫn', { exact: true }).fill('/collections');
  await page.getByLabel('Hiện dải thông báo trên đầu trang', { exact: true }).check();
  await page.getByLabel('Nội dung', { exact: true }).fill(ANNOUNCEMENT_TEXT);
  await page.getByLabel('Chữ trên link (tuỳ chọn)', { exact: true }).fill(ANNOUNCEMENT_LINK);
  await page.getByLabel('Đường dẫn (tuỳ chọn)', { exact: true }).fill('/collections');
  await saveSettings(page);

  for (const path of PUBLIC_PATHS) {
    await expectPublicToContain(page, path, ANNOUNCEMENT_TEXT, true);
  }

  await page.goto('/');
  const bar = page.getByRole('complementary', { name: 'Thông báo', exact: true });
  await expect(bar).toContainText(ANNOUNCEMENT_TEXT);
  await expect(bar.getByRole('link', { name: ANNOUNCEMENT_LINK, exact: true })).toHaveAttribute('href', '/collections');
  const barTop = (await bar.boundingBox())?.y ?? Number.NaN;
  const headerTop = (await page.locator('header').first().boundingBox())?.y ?? Number.NaN;
  expect(barTop).toBeLessThan(headerTop);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Bỏ qua tới nội dung', exact: true })).toBeFocused();
});

test('a 160-character announcement does not scroll the page sideways at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await expect(page.getByRole('complementary', { name: 'Thông báo', exact: true })).toContainText(ANNOUNCEMENT_TEXT);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
});

test('turning the announcement off removes it from the HTML', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/settings');
  await page.getByLabel('Hiện dải thông báo trên đầu trang', { exact: true }).uncheck();
  await saveSettings(page);
  for (const path of PUBLIC_PATHS) {
    await expectPublicToContain(page, path, ANNOUNCEMENT_TEXT, false);
  }
});
