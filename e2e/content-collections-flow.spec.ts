import { expect, test, type APIRequestContext } from '@playwright/test';
import { adminApi, signInContext } from './support/admin-api';
import { assetPath } from './support/env';
import {
  CONTENT_SLUG_PREFIX,
  addOutfitsToCollection,
  createCollection,
  createPublishedOutfit,
  deleteContentFixtures,
  uploadMedia,
} from './support/collection-fixtures';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const nameA = `E2E Content Streetwear ${stamp}`;
const slugA = `${CONTENT_SLUG_PREFIX}streetwear-${stamp}`;
const nameB = `E2E Content Phụ kiện ${stamp}`;
const slugB = `${CONTENT_SLUG_PREFIX}b-${stamp}`;
const outfitTitles = [`E2E Content Look A ${stamp}`, `E2E Content Look B ${stamp}`];
const outfitSlugs = [`${CONTENT_SLUG_PREFIX}look-a-${stamp}`, `${CONTENT_SLUG_PREFIX}look-b-${stamp}`];

let api: APIRequestContext;
let collectionBId = '';

test.beforeAll(async () => {
  api = await adminApi();
  await deleteContentFixtures(api);
  const outfitIds: string[] = [];
  for (let i = 0; i < outfitTitles.length; i += 1) {
    outfitIds.push(await createPublishedOutfit(api, outfitSlugs[i]!, outfitTitles[i]!));
  }
  // Collection B is created through the API so the UI test can focus on A; it exists for the ordering check.
  collectionBId = await createCollection(api, {
    slug: slugB,
    name: nameB,
    status: 'published',
    coverImage: await uploadMedia(api, 'model'),
  });
  await addOutfitsToCollection(api, collectionBId, [outfitIds[1]!]);
});

test.afterAll(async () => {
  await deleteContentFixtures(api);
  await api.dispose();
});

test('admin creates a collection with a cover, adds two outfits and publishes it', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/collections/new');

  await page.getByLabel('Tên bộ sưu tập', { exact: true }).fill(nameA);
  await expect(page.getByLabel('Đường dẫn (slug)', { exact: true })).toHaveValue(slugA);
  await page.getByLabel('Ảnh bìa', { exact: true }).setInputFiles(assetPath('model.png'));
  await expect(page.getByAltText('Ảnh bìa hiện tại')).toBeVisible();
  await page.getByLabel('Trạng thái', { exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã tạo bộ sưu tập', { exact: true })).toBeVisible();
  await page.waitForURL(/\/admin\/collections\/[a-f0-9]{24}$/);

  await page.getByRole('button', { name: 'Thêm outfit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm outfit vào bộ sưu tập' });
  await dialog.getByLabel('Tìm outfit', { exact: true }).fill(`Look A ${stamp}`);
  await dialog.getByRole('checkbox', { name: outfitTitles[0], exact: true }).check();
  await dialog.getByLabel('Tìm outfit', { exact: true }).fill(`Look B ${stamp}`);
  await dialog.getByRole('checkbox', { name: outfitTitles[1], exact: true }).check();
  await dialog.getByRole('button', { name: 'Thêm vào bộ sưu tập', exact: true }).click();
  await expect(page.getByText('Đã thêm 2 outfit vào bộ sưu tập', { exact: true })).toBeVisible();
  for (const title of outfitTitles) {
    await expect(page.getByRole('cell', { name: title, exact: true })).toBeVisible();
  }
});

test('the published collection shows on /collections, its page and the header', async ({ page }) => {
  await expect
    .poll(async () => (await page.request.get('/collections')).text(), { timeout: 15_000, intervals: [500, 1_000] })
    .toContain(nameA);

  await page.goto('/collections');
  await page.getByRole('link', { name: nameA, exact: true }).click();
  await page.waitForURL(`**/collections/${slugA}`);
  await expect(page.getByRole('heading', { level: 1, name: nameA, exact: true })).toBeVisible();
  const crumbs = page.getByRole('navigation', { name: 'Đường dẫn trang' });
  await expect(crumbs.getByRole('link', { name: 'Bộ sưu tập', exact: true })).toBeVisible();
  await expect(crumbs.getByText(nameA, { exact: true })).toHaveAttribute('aria-current', 'page');
  for (const title of outfitTitles) {
    await expect(page.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible();
  }

  await expect
    .poll(async () => (await page.request.get('/')).text(), { timeout: 15_000, intervals: [500, 1_000] })
    .toContain('href="/collections"');
  await page.goto(`/collections/${slugA}`);
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Bộ sưu tập', exact: true })).toBeVisible();
});

test('admin moves the collection up and the public order follows', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/collections');
  // Other published collections may sit in the list too, so the assertions compare positions, not totals.
  const rowIndex = async (name: string) => (await page.locator('tbody tr').allInnerTexts()).findIndex((row) => row.includes(name));
  const before = await rowIndex(nameA);
  await page.getByRole('button', { name: `Chuyển ${nameA} lên`, exact: true }).click();
  await expect.poll(() => rowIndex(nameA)).toBe(before - 1);
  const aAboveB = (await rowIndex(nameA)) < (await rowIndex(nameB));

  await expect
    .poll(
      async () => {
        const html = await (await page.request.get('/collections')).text();
        return html.includes(nameA) && html.includes(nameB) && html.indexOf(nameA) < html.indexOf(nameB);
      },
      { timeout: 15_000, intervals: [500, 1_000] },
    )
    .toBe(aAboveB);
});

test('deleting a collection asks with its usage and removes it from the public list', async ({ page }) => {
  await signInContext(page.context());
  await page.goto('/admin/collections');
  await page.getByRole('link', { name: nameA, exact: true }).click();
  await page.waitForURL(/\/admin\/collections\/[a-f0-9]{24}$/);

  await page.getByRole('button', { name: 'Xoá bộ sưu tập', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Xoá bộ sưu tập', exact: true });
  await expect(confirm).toContainText('Đang có 2 outfit trong bộ sưu tập này');
  await confirm.getByRole('button', { name: 'Xoá', exact: true }).click();
  await page.waitForURL('**/admin/collections');

  await page.goto(`/admin/collections/${collectionBId}`);
  await page.getByRole('button', { name: 'Xoá bộ sưu tập', exact: true }).click();
  await page.getByRole('dialog', { name: 'Xoá bộ sưu tập', exact: true }).getByRole('button', { name: 'Xoá', exact: true }).click();
  await page.waitForURL('**/admin/collections');

  // Not asserting the header link: it stays while any other collection is published, and the dev DB may hold some.
  await expect
    .poll(async () => (await page.request.get('/collections')).text(), { timeout: 15_000, intervals: [500, 1_000] })
    .not.toContain(nameB);
  expect(await (await page.request.get('/collections')).text()).not.toContain(nameA);
});
