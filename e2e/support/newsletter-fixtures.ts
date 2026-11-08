import fs from 'node:fs';
import { expect, type APIRequestContext, type Download } from '@playwright/test';
import { updateSettings } from './admin-settings';

/** Every subscriber the e2e specs create uses this local-part prefix on the reserved test domain. */
export const E2E_EMAIL_PREFIX = 'e2e+';
export const E2E_EMAIL_DOMAIN = 'example.test';
export const CONSENT_TEXT = 'Tôi đồng ý nhận email outfit mới từ Under30ss (e2e).';

export interface SubscriberRow {
  id: string;
  email: string;
  status: 'subscribed' | 'unsubscribed';
}

/** Unique address on the reserved test domain. Nothing real is ever subscribed by these specs. */
export function e2eSubscriberEmail(): string {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return `${E2E_EMAIL_PREFIX}${unique}@${E2E_EMAIL_DOMAIN}`;
}

/** Saves a consent sentence, which switches the public signup form on. */
export async function saveConsent(text: string = CONSENT_TEXT): Promise<void> {
  await updateSettings({ newsletterConsent: { text } });
}

/** A settings PUT without the key clears the sentence, which hides the public signup form. */
export async function clearConsent(): Promise<void> {
  await updateSettings({ newsletterConsent: undefined });
}

export async function currentConsentVersion(api: APIRequestContext): Promise<number> {
  const response = await api.get('/api/admin/settings');
  expect(response.ok(), 'read admin settings').toBe(true);
  const version = ((await response.json()) as { newsletterConsentVersion?: number | null }).newsletterConsentVersion;
  expect(version, 'consent version after saving a sentence').toBeGreaterThanOrEqual(1);
  return version as number;
}

/** Posts through the public API, the same call the signup form makes (the admin session is ignored there). */
export async function subscribeViaApi(api: APIRequestContext, email: string, consentTextVersion: number) {
  return api.post('/api/public/newsletter', {
    data: { email, consent: true, consentTextVersion, source: 'home' },
  });
}

export async function findSubscriber(api: APIRequestContext, email: string): Promise<SubscriberRow | undefined> {
  const response = await api.get(`/api/admin/newsletter?q=${encodeURIComponent(email)}&size=50`);
  expect(response.ok(), 'search newsletter subscribers').toBe(true);
  const body = (await response.json()) as { items: SubscriberRow[] };
  return body.items.find((item) => item.email === email);
}

/** Hard-deletes every e2e subscriber. Loops because each page only shows a slice of the matches. */
export async function deleteE2eSubscribers(api: APIRequestContext): Promise<number> {
  let deleted = 0;
  for (let round = 0; round < 20; round += 1) {
    const response = await api.get(`/api/admin/newsletter?q=${E2E_EMAIL_DOMAIN}&size=100`);
    expect(response.ok(), 'list e2e subscribers').toBe(true);
    const mine = ((await response.json()) as { items: SubscriberRow[] }).items.filter(
      (item) => item.email.startsWith(E2E_EMAIL_PREFIX) && item.email.endsWith(`@${E2E_EMAIL_DOMAIN}`),
    );
    if (mine.length === 0) break;
    for (const item of mine) {
      const removed = await api.delete(`/api/admin/newsletter/${item.id}`);
      expect([204, 404], `delete subscriber ${item.id}`).toContain(removed.status());
      deleted += 1;
    }
  }
  return deleted;
}

export function readDownloadedCsv(download: Download): Promise<string> {
  return download.path().then((file) => {
    if (!file) throw new Error('download has no local file');
    return fs.readFileSync(file, 'utf8');
  });
}
