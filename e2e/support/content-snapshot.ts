import fs from 'node:fs';
import path from 'node:path';
import { expect, type APIRequestContext } from '@playwright/test';
import { REPO_ROOT } from './env';
import type { SettingsDocument } from './admin-settings';
import { readHome, resetHome, type HomeLayoutDto } from './home-layout';

// Outside test-results/: Playwright wipes that folder at the start of every run.
export const SNAPSHOT_FILE = path.join(REPO_ROOT, 'e2e', '.state', 'content-snapshot.json');
export const ALLOW_RESET_ENV = 'E2E_ALLOW_CONTENT_RESET';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

export interface ContentSnapshot {
  settings: SettingsDocument;
  home: { usingDefault: boolean; draft: unknown[]; published: unknown[] | null; hasUnpublishedChanges: boolean };
}

/** The content chain rewrites home, settings and collections, so it must not hit a shared stack by accident. */
export function assertContentResetAllowed(baseURL: string): void {
  const host = new URL(baseURL).hostname;
  if (LOCAL_HOSTS.has(host) || process.env[ALLOW_RESET_ENV] === '1') return;
  throw new Error(
    `Content e2e specs change the home layout, settings and collections of ${host}. ` +
      `Point E2E_BASE_URL at localhost, or set ${ALLOW_RESET_ENV}=1 to accept that on this target.`,
  );
}

/** The admin API only returns the draft, so the published content is read by reverting the draft onto it and putting the draft back. */
async function readPublishedContent(api: APIRequestContext, home: HomeLayoutDto): Promise<unknown[]> {
  if (!home.hasUnpublishedChanges) return home.draft;
  expect((await api.post('/api/admin/home/revert-draft')).ok(), 'revert home draft').toBe(true);
  const published = (await readHome(api)).draft;
  await saveDraft(api, home.draft);
  return published;
}

async function saveDraft(api: APIRequestContext, content: unknown[]): Promise<void> {
  const base = (await readHome(api)).draftUpdatedAt;
  expect((await api.put('/api/admin/home/draft', { data: { content, baseUpdatedAt: base } })).ok(), 'save home draft').toBe(true);
}

export async function takeContentSnapshot(api: APIRequestContext): Promise<ContentSnapshot> {
  const settings = await api.get('/api/admin/settings');
  expect(settings.ok(), 'read admin settings').toBe(true);
  const home = await readHome(api);
  const snapshot: ContentSnapshot = {
    settings: (await settings.json()) as SettingsDocument,
    home: {
      usingDefault: home.usingDefault,
      draft: home.draft,
      published: home.usingDefault ? null : await readPublishedContent(api, home),
      hasUnpublishedChanges: home.hasUnpublishedChanges,
    },
  };
  fs.mkdirSync(path.dirname(SNAPSHOT_FILE), { recursive: true });
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

export function loadContentSnapshot(): ContentSnapshot {
  if (!fs.existsSync(SNAPSHOT_FILE)) throw new Error(`${SNAPSHOT_FILE} is missing, refusing to touch the home layout without it`);
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8')) as ContentSnapshot;
}

/**
 * Puts the home layout back to the snapshot. The exact `previous` version and `publishedAt` cannot be restored
 * through the API: the restored publish gets a new timestamp and `previous` becomes whatever was live before it.
 */
export async function restoreHome(api: APIRequestContext, snapshot: ContentSnapshot['home']): Promise<void> {
  if (snapshot.usingDefault || !snapshot.published) {
    await resetHome(api);
    return;
  }
  await saveDraft(api, snapshot.published);
  const draftUpdatedAt = (await readHome(api)).draftUpdatedAt;
  const published = await api.post('/api/admin/home/publish', { data: { baseUpdatedAt: draftUpdatedAt } });
  expect(published.ok(), 'publish restored home layout').toBe(true);
  if (snapshot.hasUnpublishedChanges) await saveDraft(api, snapshot.draft);
}
