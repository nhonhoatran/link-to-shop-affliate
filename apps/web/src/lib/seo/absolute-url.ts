import { COLLECTIONS_PAGE_PATH, LOOKS_PAGE_PATH } from '@under30ss/shared';

/** Resolves a path or URL against the public site URL; already-absolute URLs pass through. */
export const absoluteUrl = (siteUrl: string, pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`;
};

export const outfitPath = (slug: string): string => `/look/${encodeURIComponent(slug)}`;

const withPage = (path: string, page: number): string => (page <= 1 ? path : `${path}?page=${page}`);

export const looksPagePath = (page: number): string => withPage(LOOKS_PAGE_PATH, page);

export const collectionsPagePath = (page: number): string => withPage(COLLECTIONS_PAGE_PATH, page);

export const collectionPath = (slug: string): string => `${COLLECTIONS_PAGE_PATH}/${encodeURIComponent(slug)}`;

export const collectionPagePath = (slug: string, page: number): string => withPage(collectionPath(slug), page);
