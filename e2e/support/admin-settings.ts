import { expect } from '@playwright/test';
import { adminApi } from './admin-api';

export interface FooterDocument {
  columns: { title: string; links: { label: string; href: string }[] }[];
  social: { label: string; href: string }[];
}

export interface AnnouncementDocument {
  enabled: boolean;
  text: string;
  linkLabel?: string;
  href?: string;
}

/** Admin settings document as GET /api/admin/settings returns it. */
export interface SettingsDocument {
  siteName: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl?: string | null;
  uploadMaxMb?: number;
  looksPageSize?: number;
  relatedOutfitsCount?: number;
  /** Absent means 'feed'. Home renders the home-builder sections only when this is 'sections'. */
  homeMode?: 'feed' | 'sections';
  collectionsNavEnabled?: boolean;
  collectionsLabel?: string;
  footer?: FooterDocument;
  announcement?: AnnouncementDocument;
  /** Absent until a consent sentence is saved; saving without it (a PUT that omits the key) clears it. */
  newsletterConsent?: { text: string; privacyHref?: string; privacyLabel?: string };
  newsletterConsentVersion?: number | null;
}

/** Fields a settings PUT can carry. ogImageUrl is read-only here: the PUT would unset the image. */
const WRITABLE_KEYS: (keyof SettingsDocument)[] = [
  'siteName',
  'seoTitle',
  'seoDescription',
  'uploadMaxMb',
  'looksPageSize',
  'relatedOutfitsCount',
  'homeMode',
  'collectionsNavEnabled',
  'collectionsLabel',
  'footer',
  'announcement',
  'newsletterConsent',
];

/** Settings are a full-document PUT, so every writable field must be sent back or it is erased. */
function toPutBody(document: SettingsDocument): Partial<SettingsDocument> {
  const body: Partial<SettingsDocument> = {};
  for (const key of WRITABLE_KEYS) {
    const value = document[key];
    if (value !== undefined) (body as Record<string, unknown>)[key] = value;
  }
  return body;
}

/**
 * Merges `patch` into the current settings and PUTs the whole document. A key set to undefined is removed.
 * Returns the document as it was before the change, so the caller can restore it.
 */
export async function updateSettings(patch: Partial<SettingsDocument>): Promise<SettingsDocument> {
  const api = await adminApi();
  try {
    const read = await api.get('/api/admin/settings');
    expect(read.ok(), 'read admin settings').toBe(true);
    const current = (await read.json()) as SettingsDocument;
    // A settings PUT without ogImage unsets it, and the admin GET does not expose its key, so refuse rather than drop it.
    expect(current.ogImageUrl ?? null, 'ogImage present: a settings PUT would unset it').toBeNull();

    const merged: Partial<SettingsDocument> = { ...current, ...patch };
    for (const key of Object.keys(patch) as (keyof SettingsDocument)[]) {
      if (patch[key] === undefined) delete merged[key];
    }
    const saved = await api.put('/api/admin/settings', { data: toPutBody(merged as SettingsDocument) });
    expect(saved.ok(), 'save admin settings').toBe(true);
    return current;
  } finally {
    await api.dispose();
  }
}

/** Puts back a document returned by updateSettings. Chrome fields absent from it are unset. */
export async function restoreSettings(previous: SettingsDocument): Promise<void> {
  const api = await adminApi();
  try {
    const read = await api.get('/api/admin/settings');
    expect(read.ok(), 'read admin settings').toBe(true);
    const current = (await read.json()) as SettingsDocument;
    // Keys absent from `previous` are unset by the PUT, so an original 'absent' homeMode comes back absent.
    const chrome = {
      homeMode: undefined,
      footer: undefined,
      announcement: undefined,
      collectionsNavEnabled: undefined,
      collectionsLabel: undefined,
      newsletterConsent: undefined,
    };
    const saved = await api.put('/api/admin/settings', { data: toPutBody({ ...current, ...chrome, ...previous }) });
    expect(saved.ok(), 'restore admin settings').toBe(true);
  } finally {
    await api.dispose();
  }
}
