import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { adminApi, signInContext } from './support/admin-api';
import {
  CONSENT_TEXT,
  currentConsentVersion,
  deleteE2eSubscribers,
  e2eSubscriberEmail,
  findSubscriber,
  readDownloadedCsv,
  saveConsent,
  subscribeViaApi,
} from './support/newsletter-fixtures';
import { restoreSettings, updateSettings, type SettingsDocument } from './support/admin-settings';

test.describe.configure({ mode: 'serial' });

const CHANGED_CONSENT = 'Đồng ý nhận tin e2e phiên bản hai.';
// The list shows 'Đang nhận tin'; the CSV uses the shorter 'Đang nhận' (STATUS_LABEL in newsletter-csv-export.ts).
const SUBSCRIBED = 'Đang nhận tin';
const CSV_SUBSCRIBED = 'Đang nhận';
const UNSUBSCRIBED = 'Đã huỷ';
// subscribe, unsubscribe by admin, subscribe again: the history column must keep all three, in order.
const HISTORY = /subscribe \S+ \(self, v\d+\); unsubscribe \S+ \(admin\); subscribe \S+ \(self, v\d+\)/;

let api: APIRequestContext;
let previousSettings: SettingsDocument;
let email: string;
let version: number;

test.beforeAll(async () => {
  // Home sections render on '/' only when homeMode is 'sections'; afterAll puts the original value back.
  previousSettings = await updateSettings({ homeMode: 'sections' });
  api = await adminApi();
  await saveConsent();
  version = await currentConsentVersion(api);
  email = e2eSubscriberEmail();
  expect((await subscribeViaApi(api, email, version)).status()).toBe(202);
});

test.afterAll(async () => {
  await restoreSettings(previousSettings);
  await deleteE2eSubscribers(api);
  await api.dispose();
});

test.beforeEach(async ({ context }) => {
  await signInContext(context);
});

const row = (page: Page) => page.getByRole('row').filter({ hasText: email });

async function openSearch(page: Page, query: string = email): Promise<void> {
  await page.goto(`/admin/newsletter?q=${encodeURIComponent(query)}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Đăng ký nhận tin', exact: true })).toBeVisible();
}

async function downloadCsv(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Xuất CSV', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^newsletter-\d{8}\.csv$/);
  return readDownloadedCsv(download);
}

test('the list shows the new subscriber as subscribed', async ({ page }) => {
  await openSearch(page);
  await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  await expect(row(page).getByText(SUBSCRIBED, { exact: true })).toBeVisible();
});

test('the email and status filters narrow the list', async ({ page }) => {
  await openSearch(page);
  const search = page.getByRole('search');
  await search.getByLabel('Trạng thái', { exact: true }).selectOption({ label: UNSUBSCRIBED });
  await search.getByRole('button', { name: 'Tìm', exact: true }).click();
  await expect(page).toHaveURL(/status=unsubscribed/);
  await expect(page.getByRole('cell', { name: 'Không có kết quả phù hợp.' })).toBeVisible();

  await search.getByLabel('Trạng thái', { exact: true }).selectOption({ label: SUBSCRIBED });
  await search.getByRole('button', { name: 'Tìm', exact: true }).click();
  await expect(page).toHaveURL(/status=subscribed/);
  await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
});

test('the CSV export downloads with a BOM, a header row and the subscriber', async ({ page }) => {
  await openSearch(page);
  const csv = await downloadCsv(page);
  expect(csv.startsWith('﻿'), 'UTF-8 BOM for Excel').toBe(true);
  const [header] = csv.slice(1).split('\r\n');
  expect(header).toBe('"Email","Trạng thái","Ngày đăng ký","Cập nhật","Nguồn","Phiên bản câu đồng ý","Lịch sử"');
  expect(csv).toContain(`"${email}","${CSV_SUBSCRIBED}"`);
});

test('unsubscribing asks first and then changes the badge', async ({ page }) => {
  await openSearch(page);
  await page.getByRole('button', { name: `Huỷ đăng ký ${email}`, exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Huỷ đăng ký', exact: true }).click();

  await expect(page.getByText('Đã huỷ đăng ký', { exact: true })).toBeVisible();
  await expect(row(page).getByText(UNSUBSCRIBED, { exact: true })).toBeVisible();
  expect((await findSubscriber(api, email))?.status).toBe('unsubscribed');
});

test('subscribing again with the same address makes it subscribed again', async ({ page }) => {
  expect((await subscribeViaApi(api, email, version)).status()).toBe(202);
  expect((await findSubscriber(api, email))?.status).toBe('subscribed');
  await openSearch(page);
  await expect(row(page).getByText(SUBSCRIBED, { exact: true })).toBeVisible();
});

test('the CSV history keeps subscribe, unsubscribe and subscribe in order', async ({ page }) => {
  await openSearch(page);
  const csv = await downloadCsv(page);
  expect(csv).toContain(`"${email}"`);
  expect(csv).toMatch(HISTORY);
});

test('deleting asks first and removes the subscriber', async ({ page }) => {
  await openSearch(page);
  await page.getByRole('button', { name: `Xoá vĩnh viễn ${email}`, exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xoá vĩnh viễn', exact: true }).click();

  await expect(page.getByRole('cell', { name: 'Không có kết quả phù hợp.' })).toBeVisible();
  expect(await findSubscriber(api, email)).toBeUndefined();
});

test('changing the consent sentence bumps the version and the home page shows the new text', async ({ page }) => {
  const before = await currentConsentVersion(api);
  await updateSettings({ newsletterConsent: { text: CHANGED_CONSENT } });
  expect(await currentConsentVersion(api)).toBeGreaterThan(before);

  await expect
    .poll(async () => (await page.request.get('/')).text().then((html) => html.includes(CHANGED_CONSENT)), {
      timeout: 15_000,
      intervals: [500, 1_000],
    })
    .toBe(true);
  await page.goto('/');
  await expect(page.getByRole('checkbox')).toBeVisible();
  await expect(page.getByText(CHANGED_CONSENT, { exact: false })).toBeVisible();

  await saveConsent(CONSENT_TEXT);
});
