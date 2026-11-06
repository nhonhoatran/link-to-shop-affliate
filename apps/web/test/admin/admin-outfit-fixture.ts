import type { AdminOutfitDto } from '@under30ss/shared';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';

/** Draft AdminOutfitDto built from the shared public fixture; `mutate` edits the copy before use. */
export const makeAdminOutfit = (mutate?: (outfit: AdminOutfitDto) => void): AdminOutfitDto => {
  const source = structuredClone(samplePublicOutfit);
  const outfit: AdminOutfitDto = {
    id: 'outfit-1',
    slug: source.slug,
    title: source.title,
    ...(source.seoDescription ? { seoDescription: source.seoDescription } : {}),
    modelImage: source.modelImage,
    status: 'draft',
    featured: false,
    createdAt: source.updatedAt,
    updatedAt: source.updatedAt,
    items: source.items,
  };
  mutate?.(outfit);
  return outfit;
};

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
