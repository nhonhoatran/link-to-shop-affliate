import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { adminApi } from './support/admin-api';
import { resetHome } from './support/home-layout';
import {
  clearConsent,
  deleteE2eSubscribers,
  e2eSubscriberEmail,
  findSubscriber,
  saveConsent,
} from './support/newsletter-fixtures';

test.describe.configure({ mode: 'serial' });

// The signup form only exists once a consent sentence is saved; the default layout includes the section.
const SECTION = '[data-section-id="default-newsletter-signup"]';
const FORM = 'form:has(input[name="consentTextVersion"])';
const HOME_HEADING = 'Nhận tin mới';
const SUCCESS = 'Cảm ơn bạn đã đăng ký';

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await adminApi();
  await resetHome(api);
  await clearConsent();
});

test.afterAll(async () => {
  await deleteE2eSubscribers(api);
  await api.dispose();
});

/** The public page is cached: poll the HTML until the settings change shows up before opening it in a browser. */
async function waitForHtml(page: Page, expected: string, present: boolean): Promise<void> {
  await expect
    .poll(async () => (await page.request.get('/')).text().then((html) => html.includes(expected)), {
      timeout: 15_000,
      intervals: [500, 1_000],
    })
    .toBe(present);
}

const signupForm = (page: Page) => page.locator(FORM);

test('without a saved consent sentence the home page has no signup form', async ({ page }) => {
  await waitForHtml(page, 'name="consentTextVersion"', false);
  await page.goto('/');
  await expect(page.locator(SECTION)).toHaveCount(0);
  await expect(signupForm(page)).toHaveCount(0);
});

test('with a saved sentence the form posts, shows the success copy and disables the button while sending', async ({ page }) => {
  await saveConsent();
  await waitForHtml(page, 'name="consentTextVersion"', true);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: HOME_HEADING, exact: true })).toBeVisible();

  const form = signupForm(page);
  const email = e2eSubscriberEmail();
  await form.getByLabel('Email', { exact: true }).fill(email);
  await form.getByRole('checkbox').check();

  // Hold the server action so the pending state is observable; only POSTs to "/" are delayed.
  await page.route((url) => new URL(url).pathname === '/', async (route) => {
    if (route.request().method() === 'POST') await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });
  const submit = form.getByRole('button', { name: 'Đăng ký', exact: true });
  await submit.click();
  await expect(form.getByRole('button', { name: 'Đang gửi', exact: true })).toBeDisabled();
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  await expect(page.locator('[role="status"]').filter({ hasText: SUCCESS })).toBeVisible();
  await expect(page).toHaveURL(/[?&]newsletter=ok/);
  expect((await findSubscriber(api, email))?.status).toBe('subscribed');
});

test('an unchecked consent box blocks the post and stores nothing', async ({ page }) => {
  await page.goto('/');
  const form = signupForm(page);
  const email = e2eSubscriberEmail();
  await form.getByLabel('Email', { exact: true }).fill(email);
  await form.getByRole('checkbox').uncheck();
  await form.getByRole('button', { name: 'Đăng ký', exact: true }).click();

  const validation = await form.getByRole('checkbox').evaluate((el: HTMLInputElement) => el.validationMessage);
  expect(validation, 'browser validation message for the consent box').not.toBe('');
  await expect(page).not.toHaveURL(/newsletter=/);
  expect(await findSubscriber(api, email)).toBeUndefined();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the form posts, redirects with ?newsletter=ok and shows the message', async ({ page }) => {
    await page.goto('/');
    const form = signupForm(page);
    const email = e2eSubscriberEmail();
    await form.getByLabel('Email', { exact: true }).fill(email);
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Đăng ký', exact: true }).click();

    await page.waitForURL(/[?&]newsletter=ok/);
    await expect(page.locator('[role="status"]').filter({ hasText: SUCCESS })).toBeVisible();
    expect((await findSubscriber(api, email))?.status).toBe('subscribed');
  });

  test('a filled honeypot answers ok but stores no subscriber', async ({ page }) => {
    await page.goto('/');
    const form = signupForm(page);
    const email = e2eSubscriberEmail();
    await form.getByLabel('Email', { exact: true }).fill(email);
    await form.getByRole('checkbox').check();
    await form.locator('input[name="website"]').fill('https://spam.example.test', { force: true });
    await form.getByRole('button', { name: 'Đăng ký', exact: true }).click();

    await page.waitForURL(/[?&]newsletter=ok/);
    expect(await findSubscriber(api, email)).toBeUndefined();
  });

  // Runs last: it saves a new consent sentence, so later tests in this file would post a stale version.
  test('a form rendered before the sentence changed answers stale and stores nothing', async ({ page }) => {
    await page.goto('/');
    const form = signupForm(page);
    const email = e2eSubscriberEmail();
    await form.getByLabel('Email', { exact: true }).fill(email);
    await form.getByRole('checkbox').check();

    await saveConsent('Câu đồng ý e2e đã đổi trong lúc form đang mở.');
    await form.getByRole('button', { name: 'Đăng ký', exact: true }).click();

    await page.waitForURL(/[?&]newsletter=stale/);
    expect(await findSubscriber(api, email)).toBeUndefined();
    await saveConsent();
  });
});
