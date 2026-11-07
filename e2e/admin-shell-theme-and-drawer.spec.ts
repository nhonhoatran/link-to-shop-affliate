import { test, expect } from '@playwright/test';
import { signInContext } from './support/admin-api';

test.beforeEach(async ({ context }) => {
  await signInContext(context);
});

test('dark theme survives reload and is already in the server HTML', async ({ page, context }) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Tối', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tối', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('div[data-theme="dark"]')).toHaveCount(1);

  const cookie = (await context.cookies()).find((c) => c.name === 'admin-theme');
  expect(cookie).toMatchObject({ value: 'dark', path: '/admin', httpOnly: true });

  await page.reload();
  await expect(page.locator('div[data-theme="dark"]')).toHaveCount(1);

  // The attribute must be in the HTML the server sends, so the first paint is already dark (no flash).
  const html = await (await page.request.get('/admin')).text();
  expect(html).toContain('data-theme="dark"');
});

test('a theme value the server does not know is rejected and the current theme stays', async ({ page, context }) => {
  await page.goto('/admin');
  await expect(page.locator('div[data-theme="system"]')).toHaveCount(1);

  const tampered = page.getByRole('button', { name: 'Tối', exact: true });
  await tampered.evaluate((el) => {
    (el as HTMLButtonElement).value = 'evil';
  });
  const saved = page.waitForResponse((res) => res.request().method() === 'POST');
  await tampered.click();
  await saved;

  expect((await context.cookies()).find((c) => c.name === 'admin-theme')?.value).not.toBe('evil');
  await page.reload();
  await expect(page.locator('div[data-theme="system"]')).toHaveCount(1);
});

test('collapsed sidebar stays collapsed after reload', async ({ page, context }) => {
  await page.goto('/admin');
  await expect(page.locator('[data-sidebar="expanded"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Thu gọn menu', exact: true }).click();
  await expect(page.locator('[data-sidebar="rail"]')).toHaveCount(1);

  await page.reload();
  await expect(page.locator('[data-sidebar="rail"]')).toHaveCount(1);
  const cookie = (await context.cookies()).find((c) => c.name === 'admin-sidebar');
  expect(cookie).toMatchObject({ value: 'rail', path: '/admin' });
});

test('old outfit-list query on /admin redirects to the outfit list with a 307', async ({ page }) => {
  const response = await page.request.get('/admin?status=draft', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()['location']).toMatch(/\/admin\/outfits\?status=draft$/);

  await page.goto('/admin?status=draft');
  await expect(page).toHaveURL(/\/admin\/outfits\?status=draft$/);
});

test('saving settings shows a status toast', async ({ page }) => {
  await page.goto('/admin/settings');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await expect(page.getByRole('status').getByText('Đã lưu cài đặt', { exact: true })).toBeVisible();
});

test.describe('mobile navigation drawer', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens from the menu button, closes on Escape and returns focus to the button', async ({ page }) => {
    await page.goto('/admin');
    const menuButton = page.getByRole('button', { name: 'Mở menu', exact: true });
    await menuButton.click();

    const drawer = page.getByRole('dialog', { name: 'Menu quản trị' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Cài đặt', exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test('closes with its close button and closes after navigating to another section', async ({ page }) => {
    await page.goto('/admin');
    const drawer = page.getByRole('dialog', { name: 'Menu quản trị' });

    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'Đóng menu', exact: true }).click();
    await expect(drawer).toBeHidden();

    await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
    await drawer.getByRole('link', { name: 'Cài đặt', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/settings$/);
    await expect(drawer).toBeHidden();
  });
});
