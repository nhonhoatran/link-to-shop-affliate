import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { adminApi, signInContext } from './support/admin-api';
import { resetHome } from './support/home-layout';
import { restoreSettings, updateSettings, type SettingsDocument } from './support/admin-settings';

test.use({ viewport: { width: 390, height: 844 } });
test.describe.configure({ mode: 'serial' });

// Default layout has 5 sections since the editorial redesign (Q3); was 3 before.
const DEFAULT_CARD_COUNT = 5;
const MIN_TOUCH_TARGET_PX = 44;

let api: APIRequestContext;
let previousSettings: SettingsDocument;

test.beforeAll(async () => {
  // Home sections render on '/' only when homeMode is 'sections'; afterAll puts the original value back.
  previousSettings = await updateSettings({ homeMode: 'sections' });
  api = await adminApi();
  await resetHome(api);
});

test.afterAll(async () => {
  await restoreSettings(previousSettings);
  await resetHome(api);
  await api.dispose();
});

const cards = (page: Page) => page.locator('[data-section-card]');

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
}

test('tabs switch between edit and preview panes and keep the editor state', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/home');
  await expect(cards(page)).toHaveCount(DEFAULT_CARD_COUNT);

  await page.getByRole('button', { name: '+ Thêm section', exact: true }).click();
  await page.getByRole('dialog', { name: 'Thêm section' }).getByRole('button', { name: /^Lookbook nổi bật/ }).click();
  await expect(cards(page)).toHaveCount(DEFAULT_CARD_COUNT + 1);
  await expect(page.getByRole('group', { name: /^Nội dung Lookbook nổi bật/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Xem trước', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Xem trước', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Chỉnh sửa', exact: true })).toHaveAttribute('aria-selected', 'false');

  await page.getByRole('tab', { name: 'Chỉnh sửa', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Chỉnh sửa', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(cards(page)).toHaveCount(DEFAULT_CARD_COUNT + 1);
  await expect(page.getByRole('group', { name: /^Nội dung Lookbook nổi bật/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('up and down buttons reorder, and the keyboard drag works with an announcement', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/home');
  await expect(cards(page)).toHaveCount(DEFAULT_CARD_COUNT);

  await expect(cards(page).first().locator('[data-move="up"]')).toBeDisabled();
  await expect(cards(page).last().locator('[data-move="down"]')).toBeDisabled();

  // Default order: Lookbook, Bộ sưu tập, Outfit khác, Thư viện, Đăng ký. Moving the lookbook down puts Bộ sưu tập first.
  await cards(page).first().locator('[data-move="down"]').click();
  await expect(cards(page).first()).toContainText('Bộ sưu tập');
  await expect(page.getByRole('status').filter({ hasText: 'Đã chuyển Lookbook nổi bật tới vị trí 2/5' })).toHaveCount(1);

  // Keyboard only: Space lifts the handle, arrows move it, Space drops it. Each key waits for the previous
  // announcement, because dnd-kit measures the drop targets asynchronously and swallows keys sent too early.
  const announced = (text: RegExp) => expect(page.getByRole('status').filter({ hasText: text })).toHaveCount(1);
  const handle = cards(page).nth(2).getByRole('button', { name: /^Kéo để sắp xếp/ });
  await handle.focus();
  await page.keyboard.press('Space');
  await announced(/Đã nhấc|đang ở vị trí 3\/5/);
  await page.keyboard.press('ArrowUp');
  await announced(/đang ở vị trí 2\/5/);
  await page.keyboard.press('ArrowUp');
  await announced(/đang ở vị trí 1\/5/);
  await page.keyboard.press('Space');
  await expect(page.getByRole('status').filter({ hasText: /Đã thả .* tại vị trí 1\/5/ })).toHaveCount(1);
  await expect(cards(page).first()).toContainText('Outfit khác');
  await expectNoHorizontalScroll(page);
});

test('a section can be added, published and undone on a phone, with 44px targets', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/home');
  await expect(cards(page)).toHaveCount(DEFAULT_CARD_COUNT);

  await page.getByRole('button', { name: '+ Thêm section', exact: true }).click();
  await page.getByRole('dialog', { name: 'Thêm section' }).getByRole('button', { name: /^Lookbook nổi bật/ }).click();
  await expect(cards(page)).toHaveCount(DEFAULT_CARD_COUNT + 1);

  // Narrow screens keep "Lưu nháp" and "Mở trang xem trước" in the Khác menu only.
  await expect(page.getByRole('button', { name: 'Lưu nháp', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Khác', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Lưu nháp', exact: true }).click();
  await expect(page.getByText('Đã lưu nháp', { exact: true })).toBeVisible();

  const publish = page.getByRole('button', { name: 'Đăng', exact: true });
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.getByText('Đã đăng trang chủ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await expect(page.getByText('Đã khôi phục bản đăng trước', { exact: true }).last()).toBeVisible();

  for (const target of [
    publish,
    page.getByRole('button', { name: 'Khác', exact: true }),
    ...(await cards(page).first().locator('button:visible').all()),
  ]) {
    const box = await target.boundingBox();
    expect(box, 'visible target has a box').not.toBeNull();
    expect(box!.width, 'target width').toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
    expect(box!.height, 'target height').toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
  }
  await expectNoHorizontalScroll(page);
});
