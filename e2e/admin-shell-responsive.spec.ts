import { test, expect, type Page } from '@playwright/test';
import { adminApi, signInContext } from './support/admin-api';

const VIEWPORTS = [320, 390, 768, 1024, 1440] as const;
const ADMIN_SCREENS = ['/admin', '/admin/outfits', '/admin/outfits/new', '/admin/settings', '/admin/users'];
const MIN_TAP_PX = 44;

test.beforeEach(async ({ context }) => {
  await signInContext(context);
});

const pageWidths = (page: Page) =>
  page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));

for (const width of VIEWPORTS) {
  test(`admin screens have no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ADMIN_SCREENS) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      const metrics = await pageWidths(page);
      expect(metrics.scrollWidth, `${path} at ${width}px: horizontal overflow`).toBeLessThanOrEqual(metrics.innerWidth);
    }
  });
}

for (const width of [320, 390] as const) {
  test(`menu button is a full-size tap target at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/admin');
    const box = await page.getByRole('button', { name: 'Mở menu', exact: true }).boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_TAP_PX);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TAP_PX);
  });
}

test.describe('editor panels', () => {
  let outfitId: string;

  test.beforeAll(async () => {
    const api = await adminApi();
    try {
      const response = await api.get('/api/admin/outfits?page=1&size=1');
      expect(response.ok(), 'list outfits for editor check').toBe(true);
      const body = (await response.json()) as { items: { id: string }[] };
      const first = body.items[0];
      expect(first, 'at least one outfit exists for the editor check').toBeDefined();
      outfitId = first!.id;
    } finally {
      await api.dispose();
    }
  });

  test('phone width shows the three editor tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/outfits/${outfitId}`);
    const tabs = page.getByRole('tablist').getByRole('tab');
    await expect(tabs).toHaveCount(3);
    await expect(page.getByRole('tab', { name: 'Thông tin', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Món đồ', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Xem trước', exact: true })).toBeVisible();
  });

  test('desktop width shows every panel without tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/admin/outfits/${outfitId}`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole('tablist')).toHaveCount(0);
  });
});

test('a missing outfit renders the admin 404 inside the admin shell', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/outfits/000000000000000000000000');
  await expect(page.getByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toBeVisible();
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Quản trị', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Về danh sách outfit' })).toBeVisible();
});

test('editor tab list stays below the sticky action bar while scrolling at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  const api = await adminApi();
  let id: string;
  try {
    const body = (await (await api.get('/api/admin/outfits?page=1&size=1')).json()) as { items: { id: string }[] };
    id = body.items[0]!.id;
  } finally {
    await api.dispose();
  }
  await page.goto(`/admin/outfits/${id}`);
  await page.getByRole('tab', { name: 'Món đồ', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 400));
  const tabs = await page.getByRole('tablist').boundingBox();
  const bar = await page.locator('[data-editor-actions]').boundingBox();
  expect(bar).not.toBeNull();
  expect(tabs!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height - 1);
});
