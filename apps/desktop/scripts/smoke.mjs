/* global window, document, Image */
import { _electron, expect } from '@playwright/test';
import electron from 'electron';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const repo = path.resolve('../..');
const output = path.join(repo, 'plans/reports/desktop-ai-smoke');
const temporary = await mkdtemp(path.join(tmpdir(), 'under30ss-desktop-smoke-'));
const folder = path.join(temporary, 'posters');
const data = path.join(temporary, 'data');
await mkdir(folder); await mkdir(data); await mkdir(output, { recursive: true });
await writeFile(path.join(data, 'settings.json'), JSON.stringify({ cli: { model: 'gpt-6-astra' } }));
await copyFile(path.join(repo, 'assets-source/lookbook-samples/outfit-mesh-84-reference.png'), path.join(folder, 'poster.png'));
const errors = [];
const capture = async (application, name) => {
  const png = await application.evaluate(async ({ BrowserWindow }) =>
    (await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined, { stayHidden: true, stayAwake: true })).toPNG().toString('base64'));
  await writeFile(path.join(output, name), Buffer.from(png, 'base64'));
};
const launch = async () => {
  const env = { ...process.env, UNDER30SS_DESKTOP_SMOKE: '1', UNDER30SS_DESKTOP_TEST_DATA: data };
  delete env.ELECTRON_RUN_AS_NODE;
  const application = await _electron.launch({ executablePath: electron, args: [path.resolve('.')],
    env, timeout: 30_000 });
  const page = await application.firstWindow();
  page.on('pageerror', (error) => errors.push(error.message));
  await expect(page.getByRole('heading', { name: 'Nhập bộ sưu tập bằng AI' })).toBeVisible();
  return { application, page };
};
let { application, page } = await launch();
try {
  const security = await application.evaluate(({ BrowserWindow }) => {
    const preferences = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return { nodeIntegration: preferences.nodeIntegration, contextIsolation: preferences.contextIsolation, sandbox: preferences.sandbox };
  });
  const electronVersion = await application.evaluate(() => process.versions.electron);
  expect(security).toEqual({ nodeIntegration: false, contextIsolation: true, sandbox: true });
  expect(await page.evaluate(() => typeof window.require)).toBe('undefined');
  const secondEnv = { ...process.env, UNDER30SS_DESKTOP_SMOKE: '1', UNDER30SS_DESKTOP_TEST_DATA: data };
  delete secondEnv.ELECTRON_RUN_AS_NODE;
  await new Promise((resolve, reject) => {
    const child = spawn(electron, [path.resolve('.')], { env: secondEnv, windowsHide: true, stdio: 'ignore' });
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Second instance did not exit')); }, 10_000);
    child.once('error', reject);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(); else reject(new Error(`Second instance exited ${code}`));
    });
  });
  expect(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(1);
  const view = await page.evaluate(() => window.desktop.invoke('readSettings', {}));
  expect(view.credential.encryptionAvailable).toBe(true);
  expect(view.settings.cli.model).toBe('gpt-6.1-sol');
  expect(JSON.parse(await readFile(path.join(data, 'settings.json'), 'utf8')).cli.model).toBe('gpt-6.1-sol');
  const settings = { ...view.settings, siteUrl: 'http://127.0.0.1:44009', siteName: 'Kiểm thử local' };
  const secret = 'under30ss-desktop-smoke-token-not-for-production';
  const saved = await page.evaluate(({ settings, secret }) => window.desktop.invoke('saveSettings', { settings, token: secret }), { settings, secret });
  expect(saved.credential.configured).toBe(true);
  expect(JSON.stringify(saved)).not.toContain(secret);
  for (const name of ['settings.json', 'credential.json']) expect(await readFile(path.join(data, name), 'utf8')).not.toContain(secret);
  await application.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] });
  }, folder);
  const selected = await page.evaluate(() => window.desktop.invoke('chooseFolder', {}));
  expect(selected.folderLabel).toBe('posters');
  const session = await page.evaluate((selectionId) => window.desktop.invoke('createSession', { selectionId, name: 'Kiểm thử Electron thực' }), selected.selectionId);
  const files = await page.evaluate((sessionId) => window.desktop.invoke('listFiles', { sessionId, page: 1, size: 20 }), session.id);
  expect(files.total).toBe(1);
  const analysis = JSON.parse(await readFile(path.join(repo, 'plans/reports/261118-codex-desktop-live-probe.json'), 'utf8')).samples[0].analysis;
  expect(analysis.items.length).toBeGreaterThan(0);
  const draft = { title: analysis.title, slug: 'electron-smoke', seoDescription: analysis.description || '',
    collection: { name: 'Kiểm thử crop thực', slug: 'electron-smoke', description: '' }, modelCrop: analysis.modelCrop,
    reviewReasons: analysis.reviewReasons, items: analysis.items.map((item) => ({ ...item, name: item.name || 'Cần biên tập',
      subtitle: item.subtitle || '', description: item.description || '', sourceAnchor: null, affiliateUrl: '' })) };
  let file = await page.evaluate((args) => window.desktop.invoke('updateDraft', args), {
    sessionId: session.id, fileId: files.items[0].id, expectedRevision: 0, draft,
  });
  expect(file.revision).toBe(1);
  const image = await page.evaluate(({ sessionId, assetId }) => new Promise((resolve) => {
    const element = new Image(); element.onload = () => resolve({ width: element.naturalWidth, height: element.naturalHeight });
    element.onerror = () => resolve(null); element.src = window.desktop.assetUrl(sessionId, assetId);
  }), { sessionId: session.id, assetId: file.modelAssetId });
  expect(image.width).toBeGreaterThan(0);
  file = await page.evaluate((args) => window.desktop.invoke('approve', args), { sessionId: session.id, fileId: file.id, expectedRevision: 1 });
  expect(file.approvedRevision).toBe(1);
  file = await page.evaluate((args) => window.desktop.invoke('updateDraft', args), {
    sessionId: session.id, fileId: file.id, expectedRevision: 1, draft: { ...draft, title: `${draft.title} · Đã sửa` },
  });
  expect(file.approvedRevision).toBeNull();
  await page.reload();
  await page.getByRole('button', { name: /Kiểm thử Electron thực/ }).click();
  await page.getByRole('button', { name: /poster.png/ }).click();
  await expect(page.getByRole('heading', { name: 'poster.png' })).toBeVisible();
  await page.getByRole('heading', { name: 'poster.png' }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await capture(application, 'review-wide.png');
  await page.locator('.review-columns').evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(150);
  await capture(application, 'review-crops-wide.png');
  await page.setViewportSize({ width: 860, height: 760 });
  await page.getByRole('heading', { name: 'poster.png' }).scrollIntoViewIfNeeded();
  await page.locator('.review-columns').evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(150);
  await capture(application, 'review-small.png');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await application.close();
  ({ application, page } = await launch());
  const restored = await page.evaluate((args) => window.desktop.invoke('getFile', args), { sessionId: session.id, fileId: file.id });
  expect(restored.revision).toBe(2); expect(restored.approvedRevision).toBeNull();
  expect((await page.evaluate(() => window.desktop.invoke('readSettings', {}))).credential.configured).toBe(true);
  const traversal = await page.evaluate(async (sessionId) => {
    const element = new Image();
    return await new Promise((resolve) => { element.onload = () => resolve(true); element.onerror = () => resolve(false);
      element.src = `import-asset://asset/${sessionId}/unknown-asset`; });
  }, session.id);
  expect(traversal).toBe(false);
  expect(errors).toEqual([]);
  await writeFile(path.join(output, 'result.json'), JSON.stringify({ recordedAt: new Date().toISOString(), status: 'passed',
    electronVersion, security, checks: ['native preload IPC', 'OS token encryption',
      'legacy model settings migrated to explicit GPT 6.1 Sol default',
      'native folder picker boundary (dialog stub)', 'real source normalization and crop asset protocol', 'approval invalidation',
      'restart checkpoint and settings', 'single instance lock', 'narrow viewport', 'unknown asset denied'],
    analysis: 'Uses previously recorded live Codex analysis; no website sync or new AI call in this smoke test', errors }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'passed', evidence: path.relative(repo, output), errors }));
} finally { await application.close(); }
