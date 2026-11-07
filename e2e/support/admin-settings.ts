import { expect, type APIResponse } from '@playwright/test';
import { adminApi } from './admin-api';

interface AdminSettings {
  siteName: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl?: string | null;
  uploadMaxMb?: number;
  looksPageSize?: number;
  relatedOutfitsCount?: number;
}

const readSettings = async (response: APIResponse): Promise<AdminSettings> => {
  expect(response.ok(), 'read admin settings').toBe(true);
  return (await response.json()) as AdminSettings;
};

/**
 * Sets looksPageSize and returns the previous value. A settings PUT replaces the whole document,
 * so every other field is sent back unchanged. Passing undefined unsets the key (env default applies).
 */
export async function setLooksPageSize(value: number | undefined): Promise<number | undefined> {
  const api = await adminApi();
  try {
    const current = await readSettings(await api.get('/api/admin/settings'));
    // A settings PUT without ogImage unsets it, and the admin GET does not expose its key, so refuse rather than drop it.
    expect(current.ogImageUrl ?? null, 'ogImage present: a settings PUT would unset it').toBeNull();

    const body = {
      siteName: current.siteName,
      seoTitle: current.seoTitle,
      seoDescription: current.seoDescription,
      ...(current.uploadMaxMb === undefined ? {} : { uploadMaxMb: current.uploadMaxMb }),
      ...(current.relatedOutfitsCount === undefined ? {} : { relatedOutfitsCount: current.relatedOutfitsCount }),
      ...(value === undefined ? {} : { looksPageSize: value }),
    };
    const saved = await api.put('/api/admin/settings', { data: body });
    expect(saved.ok(), 'save looksPageSize').toBe(true);
    return current.looksPageSize;
  } finally {
    await api.dispose();
  }
}
