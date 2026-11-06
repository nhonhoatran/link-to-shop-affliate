/** Resolves a path or URL against the public site URL; already-absolute URLs pass through. */
export const absoluteUrl = (siteUrl: string, pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`;
};

export const outfitPath = (slug: string): string => `/look/${encodeURIComponent(slug)}`;
