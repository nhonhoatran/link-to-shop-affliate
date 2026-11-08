import fs from 'node:fs';
import { expect, type APIRequestContext } from '@playwright/test';
import { assetPath } from './env';

/** Every collection and outfit the content specs create uses this slug prefix, so teardown can find them. */
export const CONTENT_SLUG_PREFIX = 'e2e-content-';

export interface ImageRef {
  key: string;
  width: number;
  height: number;
  url?: string;
}

interface ListResponse<T> {
  items: T[];
  total: number;
  size: number;
}

/** Uploads the test model image through the admin media API and returns the stored reference. */
export async function uploadMedia(api: APIRequestContext, kind: 'model' | 'item' = 'model'): Promise<ImageRef> {
  const response = await api.post(`/api/admin/media?kind=${kind}`, {
    multipart: {
      file: { name: 'model.png', mimeType: 'image/png', buffer: fs.readFileSync(assetPath('model.png')) },
    },
  });
  expect(response.ok(), 'upload media').toBe(true);
  return (await response.json()) as ImageRef;
}

/** Creates a published outfit with no items: enough for card, list and collection pages. */
export async function createPublishedOutfit(api: APIRequestContext, slug: string, title: string): Promise<string> {
  const modelImage = await uploadMedia(api, 'model');
  const response = await api.post('/api/admin/outfits', {
    data: { slug, title, status: 'published', featured: false, modelImage: stripUrl(modelImage), items: [] },
  });
  expect(response.ok(), `create outfit ${slug}`).toBe(true);
  return ((await response.json()) as { id: string }).id;
}

export async function createCollection(
  api: APIRequestContext,
  input: { slug: string; name: string; status: 'draft' | 'published'; coverImage?: ImageRef },
): Promise<string> {
  const response = await api.post('/api/admin/collections', {
    data: {
      slug: input.slug,
      name: input.name,
      status: input.status,
      ...(input.coverImage ? { coverImage: stripUrl(input.coverImage) } : {}),
    },
  });
  expect(response.ok(), `create collection ${input.slug}`).toBe(true);
  return ((await response.json()) as { id: string }).id;
}

export async function addOutfitsToCollection(api: APIRequestContext, collectionId: string, outfitIds: string[]): Promise<void> {
  const response = await api.post(`/api/admin/collections/${collectionId}/outfits`, { data: { outfitIds } });
  expect(response.ok(), 'add outfits to collection').toBe(true);
}

/** The API stores only key + size; the url is attached on read. */
export const stripUrl = (image: ImageRef): Omit<ImageRef, 'url'> => ({ key: image.key, width: image.width, height: image.height });

/** Walks every page of an admin list endpoint and returns all items. */
async function listAll<T>(api: APIRequestContext, path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const response = await api.get(`${path}?page=${page}`);
    expect(response.ok(), `list ${path}`).toBe(true);
    const body = (await response.json()) as ListResponse<T>;
    items.push(...body.items);
    if (body.items.length === 0 || items.length >= body.total) break;
  }
  return items;
}

/** Deletes the collections and outfits that the content specs created (matched by slug prefix). */
export async function deleteContentFixtures(api: APIRequestContext): Promise<void> {
  const collections = await listAll<{ id: string; slug: string }>(api, '/api/admin/collections');
  for (const collection of collections.filter((item) => item.slug.startsWith(CONTENT_SLUG_PREFIX))) {
    const deleted = await api.delete(`/api/admin/collections/${collection.id}`);
    expect([200, 204, 404], `delete collection ${collection.slug}`).toContain(deleted.status());
  }

  const outfits = await listAll<{ id: string; slug: string }>(api, '/api/admin/outfits');
  for (const outfit of outfits.filter((item) => item.slug.startsWith(CONTENT_SLUG_PREFIX))) {
    const deleted = await api.delete(`/api/admin/outfits/${outfit.id}`);
    expect([200, 204, 404], `delete outfit ${outfit.slug}`).toContain(deleted.status());
  }
}
