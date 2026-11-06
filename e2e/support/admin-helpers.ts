import type { Page } from '@playwright/test';
import { ADMIN_EMAIL, adminPassword, escapeRegExp } from './env';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(adminPassword());
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/admin');
}

/** Item row in the editor list. The drag handle is labelled "Kéo để sắp xếp ..." so the ^ anchor skips it. */
export function itemRow(page: Page, currentName: string) {
  return page.getByRole('button', { name: new RegExp(`^${escapeRegExp(currentName)}`) });
}
