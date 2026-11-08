import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { adminApi, signInContext } from './support/admin-api';
import { CONTENT_SLUG_PREFIX, createPublishedOutfit, deleteContentFixtures } from './support/collection-fixtures';
import { resetHome } from './support/home-layout';

test.use({ viewport: { width: 1440, height: 900 } });
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const listTitle = `E2E ${stamp} danh sách`;
const tilesTitle = `E2E ${stamp} bộ sưu tập`;
const ORIGINAL_CARD_COUNT = 3;

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await adminApi();
  await deleteContentFixtures(api);
  await resetHome(api);
  // The outfit list hides itself when it has no outfit; one published outfit keeps the new title visible on "/".
  await createPublishedOutfit(api, `${CONTENT_SLUG_PREFIX}editor-${stamp}`, `E2E Content Editor ${stamp}`);
});

test.afterAll(async () => {
  await resetHome(api);
  await deleteContentFixtures(api);
  await api.dispose();
});

const cards = (page: Page) => page.locator('[data-section-card]');

async function indexOfCard(page: Page, text: string): Promise<number> {
  return cards(page).evaluateAll((elements, needle) => elements.findIndex((el) => el.textContent?.includes(needle)), text);
}

async function addSection(page: Page, typeLabel: string): Promise<void> {
  await page.getByRole('button', { name: '+ Thêm section', exact: true }).click();
  await page.getByRole('dialog', { name: 'Thêm section' }).getByRole('button', { name: new RegExp(`^${typeLabel}`) }).click();
}

/** Public home text is cached; right after a publish or undo the first request can still be stale, so poll. */
async function expectHomeToContain(page: Page, text: string, present: boolean): Promise<void> {
  const matcher = expect.poll(async () => (await page.request.get('/')).text(), { timeout: 15_000, intervals: [500, 1_000] });
  if (present) await matcher.toContain(text);
  else await matcher.not.toContain(text);
}

const undoButton = (page: Page): Locator => page.getByRole('button', { name: 'Hoàn tác', exact: true });

test('admin adds sections, saves a draft, publishes, undoes the publish and restores it from the menu', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/home');
  await expect(page.getByRole('heading', { level: 1, name: 'Trang chủ', exact: true })).toBeVisible();
  await expect(cards(page)).toHaveCount(ORIGINAL_CARD_COUNT);

  await addSection(page, 'Danh sách outfit');
  await page.getByLabel('Tiêu đề', { exact: true }).fill(listTitle);
  await addSection(page, 'Bộ sưu tập');
  await page.getByLabel('Tiêu đề', { exact: true }).fill(tilesTitle);
  await addSection(page, 'Lookbook nổi bật');
  await expect(cards(page)).toHaveCount(ORIGINAL_CARD_COUNT + 3);

  await cards(page).last().getByRole('switch').click();
  await expect(cards(page).last().getByRole('switch')).toHaveAttribute('aria-checked', 'false');

  // The new list card starts after the three default sections; move it to the top with the Lên button.
  for (let index = await indexOfCard(page, listTitle); index > 0; index -= 1) {
    await cards(page).nth(index).locator('[data-move="up"]').click();
  }
  await expect(cards(page).first()).toContainText(listTitle);

  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await expect(page.getByText('Đã lưu nháp', { exact: true })).toBeVisible();

  await page.goto('/admin/home-preview');
  await expect(page.getByText('Bản xem trước, chưa đăng', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: listTitle, exact: true })).toBeVisible();
  await expectHomeToContain(page, listTitle, false);

  await page.goto('/admin/home');
  await page.getByRole('button', { name: 'Đăng', exact: true }).click();
  await expect(page.getByText('Đã đăng trang chủ', { exact: true })).toBeVisible();
  // Hovering pauses the toast timer, so the undo button stays while the public page catches up.
  await undoButton(page).hover();
  await expectHomeToContain(page, listTitle, true);

  await undoButton(page).click();
  await expect(page.getByText('Đã khôi phục bản đăng trước', { exact: true })).toBeVisible();
  await expect(page.getByText('Có thay đổi chưa đăng', { exact: true })).toBeVisible();
  await expectHomeToContain(page, listTitle, false);

  await page.getByRole('button', { name: 'Khác', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Hoàn tác lần đăng gần nhất', exact: true }).click();
  // The earlier restore toast may still be on screen; the newest one is the last match.
  await expect(page.getByText('Đã khôi phục bản đăng trước', { exact: true }).last()).toBeVisible();
  await expectHomeToContain(page, listTitle, true);
});

test('two tabs saving the same layout get a conflict, and the default reset asks first', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/home');
  const second = await page.context().newPage();
  await second.goto('/admin/home');
  await expect(cards(second)).toHaveCount(ORIGINAL_CARD_COUNT + 3);

  await cards(page).last().getByRole('switch').click();
  await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await expect(page.getByText('Đã lưu nháp', { exact: true })).toBeVisible();

  await cards(second).first().getByRole('switch').click();
  await second.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
  await expect(second.getByText('Bố cục vừa được sửa ở nơi khác. Tải lại để xem bản mới nhất.', { exact: true })).toBeVisible();
  await expect(second.getByRole('button', { name: 'Tải lại', exact: true })).toBeVisible();
  await second.close();

  await page.getByRole('button', { name: 'Khác', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Khôi phục bố cục mặc định', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Khôi phục bố cục mặc định?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Khôi phục mặc định', exact: true }).click();
  await expect(page.getByText('Đã khôi phục bố cục mặc định', { exact: true })).toBeVisible();
  await expect(page.getByText('Đang dùng bố cục mặc định', { exact: true })).toBeVisible();
  await expectHomeToContain(page, listTitle, false);
});
