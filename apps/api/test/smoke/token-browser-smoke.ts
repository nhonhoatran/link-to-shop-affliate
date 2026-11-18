import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, expect, type Browser } from '@playwright/test';
import { startTokenBrowserHost } from './token-browser-host';

const repoRoot = path.resolve(__dirname, '../../../..');
const evidence = path.join(repoRoot, 'plans/reports/desktop-token-smoke');
const redact = (value: string) => value.replace(/u30_import_[A-Za-z0-9_-]{16,}/g, '[REDACTED]');

const run = async () => {
  await mkdir(evidence, { recursive: true });
  const host = await startTokenBrowserHost(repoRoot);
  let browser: Browser | undefined;
  const checks: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  try {
    await host.ready();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(redact(message.text())); });
    page.on('pageerror', (error) => pageErrors.push(redact(error.message)));
    await page.goto(`${host.origin}/admin/login`);
    await page.getByLabel('Email', { exact: true }).fill('import-smoke@example.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('test-only-smoke-password-26');
    await Promise.all([page.waitForURL((url) => url.pathname === '/admin'), page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()]);
    await page.goto(`${host.origin}/admin/import-tokens`);
    await expect(page.getByRole('heading', { level: 1, name: 'Token nhập desktop' })).toBeVisible();
    await expect(page.getByLabel('URL website')).toHaveValue(host.origin);
    checks.push('Cookie admin login and server-rendered token page against isolated API');
    await page.screenshot({ path: path.join(evidence, 'empty-desktop.png'), fullPage: true });
    await page.getByLabel('Tên thiết bị').fill('Máy smoke');
    await page.getByLabel('Hạn dùng').fill(new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 16));
    await page.getByRole('button', { name: 'Tạo token', exact: true }).click();
    const secret = page.getByLabel('Token vừa tạo');
    await expect(secret).toBeVisible();
    const token = await secret.inputValue();
    if (!token.startsWith('u30_import_')) throw new Error('Missing newly created importer token');
    const before = await fetch(`${host.apiOrigin}/api/import/capabilities`, { headers: { Authorization: `Bearer ${token}` } });
    if (before.status !== 200) throw new Error(`Token did not authorize importer: ${before.status}`);
    await page.getByRole('button', { name: 'Ẩn token', exact: true }).click();
    await expect(secret).toHaveCount(0);
    if ((await page.content()).includes(token)) throw new Error('Raw token persisted in page DOM after hiding');
    await expect(page.getByRole('cell', { name: /^Máy smoke u30_import_/ })).toBeVisible();
    checks.push('Create once, hide secret, keep only metadata in server list, importer capability 200');
    await page.screenshot({ path: path.join(evidence, 'active-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const fits = await page.evaluate<boolean>('document.documentElement.scrollWidth <= window.innerWidth + 1');
    if (!fits) throw new Error('Token page overflows the narrow viewport');
    await page.screenshot({ path: path.join(evidence, 'active-narrow.png'), fullPage: true });
    checks.push('390x844 page without horizontal overflow');
    await page.getByRole('button', { name: 'Thu hồi token Máy smoke', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Thu hồi token này?' })).toBeVisible();
    const [revocation] = await Promise.all([
      page.waitForResponse((response) => new URL(response.url()).pathname.startsWith('/api/admin/import-tokens/') && response.request().method() === 'DELETE'),
      page.getByRole('dialog').getByRole('button', { name: 'Thu hồi token', exact: true }).click(),
    ]);
    if (revocation.status() !== 204) throw new Error(`Token revoke did not succeed: ${revocation.status()}`);
    const after = await fetch(`${host.apiOrigin}/api/import/capabilities`, { headers: { Authorization: `Bearer ${token}` } });
    if (after.status !== 401) throw new Error(`Revoked token remained usable: ${after.status}`);
    // Narrow table cells include a generated data-label prefix in their accessible name.
    await expect(page.getByRole('cell', { name: /Đã thu hồi$/ })).toBeVisible();
    await page.screenshot({ path: path.join(evidence, 'revoked-narrow.png'), fullPage: true });
    checks.push('Confirm revoke, refreshed status and immediate importer capability 401');
    if (pageErrors.length) throw new Error(`Browser page errors: ${pageErrors.join('; ')}`);
    const result = { passed: true, isolated: true, next: 'compiled production build', checks, consoleErrors, pageErrors,
      screenshots: ['empty-desktop.png', 'active-desktop.png', 'active-narrow.png', 'revoked-narrow.png'] };
    await writeFile(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } catch (error) {
    const result = { passed: false, isolated: true, checks, consoleErrors, pageErrors,
      error: redact(error instanceof Error ? error.message : String(error)), serverLog: redact(host.logs()) };
    await writeFile(path.join(evidence, 'result.json'), JSON.stringify(result, null, 2) + '\n');
    console.error(JSON.stringify(result));
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await host.stop();
  }
};

void run().catch((error: unknown) => { console.error(redact(error instanceof Error ? error.message : String(error))); process.exitCode = 1; });
