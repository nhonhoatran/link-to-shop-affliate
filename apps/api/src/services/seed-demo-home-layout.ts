import { homeLayoutContentSchema, type DemoHomeSection, type DemoImage, type HomeLayoutContent, type ImageRef, type MediaKind } from '@under30ss/shared';

export interface HomeLayoutResolver {
  upload: (kind: MediaKind, image: DemoImage) => Promise<ImageRef>;
  collectionIds: Map<string, string>;
  outfitIds: Map<string, string>;
}

// Seed files name collections and outfits by slug; the stored layout needs their ids.
const SLUG_KEYS: Record<string, { target: string; lookup: 'collectionIds' | 'outfitIds'; many: boolean }> = {
  collectionSlugs: { target: 'collectionIds', lookup: 'collectionIds', many: true },
  outfitSlugs: { target: 'outfitIds', lookup: 'outfitIds', many: true },
  outfitSlug: { target: 'outfitId', lookup: 'outfitIds', many: false },
};

const requireId = (map: Map<string, string>, slug: unknown, field: string): string => {
  const id = typeof slug === 'string' ? map.get(slug) : undefined;
  if (!id) throw new Error(`Home layout ${field} refers to unknown slug ${String(slug)}`);
  return id;
};

const isDemoImage = (value: Record<string, unknown>): value is DemoImage & Record<string, unknown> =>
  typeof value.file === 'string';

const resolveValue = async (value: unknown, resolver: HomeLayoutResolver): Promise<unknown> => {
  if (Array.isArray(value)) return Promise.all(value.map((entry) => resolveValue(entry, resolver)));
  if (value === null || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if (isDemoImage(record)) return resolver.upload('model', record);
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    const slugKey = SLUG_KEYS[key];
    if (!slugKey) {
      out[key] = await resolveValue(entry, resolver);
      continue;
    }
    const map = resolver[slugKey.lookup];
    out[slugKey.target] = slugKey.many
      ? (Array.isArray(entry) ? entry : []).map((slug) => requireId(map, slug, key))
      : requireId(map, entry, key);
  }
  return out;
};

export const buildHomeContent = async (sections: DemoHomeSection[], resolver: HomeLayoutResolver): Promise<HomeLayoutContent> => {
  const resolved = [];
  for (const section of sections) {
    resolved.push({ type: section.type, props: await resolveValue(section.props, resolver) });
  }
  return homeLayoutContentSchema.parse(resolved);
};
