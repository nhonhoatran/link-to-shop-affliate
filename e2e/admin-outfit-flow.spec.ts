import { test, expect } from '@playwright/test';
import { assetPath } from './support/env';
import { itemRow, loginAsAdmin } from './support/admin-helpers';
import { writeOutfitState, type E2EOutfitItem } from './support/outfit-state';

const ITEM_SPECS = [
  {
    file: 'ao-mesh-the-thao.png',
    name: 'Áo mesh thể thao',
    description: 'Áo mesh số 84, thoáng khí.',
    anchor: { x: 50, y: 28 },
  },
  {
    file: 'quan-short-jean-rong.png',
    name: 'Quần short jean rộng',
    description: 'Form rộng, wash nhẹ.',
    anchor: { x: 50, y: 62 },
  },
  {
    file: 'giay-sneaker-den.png',
    name: 'Giày sneaker đen',
    description: 'Đế cao su, phối đen toàn bộ.',
    anchor: { x: 45, y: 92 },
  },
] as const;

test('admin creates, places and publishes an outfit that shows on the public page', async ({ page }) => {
  test.setTimeout(240_000);
  const stamp = Date.now().toString(36);
  const slug = `e2e-${stamp}`;
  const title = `E2E ${stamp}`;
  const items: E2EOutfitItem[] = ITEM_SPECS.map((spec, i) => ({
    file: spec.file,
    name: spec.name,
    description: spec.description,
    url: `https://shopee.vn/e2e-${stamp}-item-${i + 1}`,
    anchor: spec.anchor,
  }));

  await loginAsAdmin(page);

  await page.goto('/admin/outfits/new');
  await page.getByLabel('Tên outfit', { exact: true }).fill(title);
  await page.getByLabel('Đường dẫn (slug)', { exact: true }).fill(slug);
  await page.getByLabel('Ảnh người mẫu', { exact: true }).setInputFiles(assetPath('model.png'));
  await expect(page.getByAltText('Ảnh người mẫu đã tải lên')).toBeVisible();
  await page.getByRole('button', { name: 'Tạo outfit', exact: true }).click();

  await page.waitForURL(/\/admin\/outfits\/[a-f0-9]{24}$/);
  const outfitId = new URL(page.url()).pathname.split('/').pop()!;
  writeOutfitState({ outfitId, slug, title, items });

  await page.getByLabel('Thêm món', { exact: true }).setInputFiles(items.map((item) => assetPath(item.file)));
  await expect(page.getByRole('button', { name: /^Món \d/ })).toHaveCount(items.length, { timeout: 60_000 });

  for (const [i, item] of items.entries()) {
    await itemRow(page, `Món ${i + 1}`).click();
    await page.getByLabel('Tên món', { exact: true }).fill(item.name);
    await page.getByLabel('Mô tả', { exact: true }).fill(item.description);
    await page.getByLabel('Link affiliate', { exact: true }).fill(item.url);
    await itemRow(page, item.name).click();

    const canvas = page.getByTestId('anchor-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Anchor canvas is not visible');
    await canvas.click({
      position: { x: (box.width * item.anchor.x) / 100, y: (box.height * item.anchor.y) / 100 },
    });
    await expect(page.getByRole('button', { name: `Điểm của ${item.name}` })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByText('Đã lưu', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đăng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ẩn', exact: true })).toBeVisible();

  // Revalidate runs after publish; poll the public route for up to ~10s.
  await expect
    .poll(async () => (await page.request.get(`/look/${slug}`)).text(), { timeout: 10_000, intervals: [500, 1_000] })
    .toContain(title);

  await page.goto(`/look/${slug}`);
  await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
  for (const item of items) {
    await expect(page.getByRole('heading', { level: 2, name: item.name, exact: true })).toBeVisible();
  }
});
