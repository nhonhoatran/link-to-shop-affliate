import type { z } from 'zod';
import { toPublicOutfitDto, type PublicOutfitFeedResponse, type publicOutfitFeedQuerySchema } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { CollectionModel, PUBLISHED_COLLECTION_FILTER, type CollectionRecord } from '../models/collection-model';
import { OutfitModel, type OutfitRecord } from '../models/outfit-model';
import { createMediaUrlResolver, toOutfit } from './outfit-mapper';
import { getListingSettings } from './settings-service';

/** Returns null when `collection` is given but is not a published collection. */
export const listPublishedOutfitFeed = async (
  query: z.output<typeof publicOutfitFeedQuerySchema>,
  env: Env,
): Promise<PublicOutfitFeedResponse | null> => {
  let collectionId: CollectionRecord['_id'] | undefined;
  if (query.collection) {
    const collection = await CollectionModel.findOne({ ...PUBLISHED_COLLECTION_FILTER, slug: query.collection })
      .select({ _id: 1 })
      .lean<Pick<CollectionRecord, '_id'>>();
    if (!collection) return null;
    collectionId = collection._id;
  }
  const size = Math.min(query.size ?? (await getListingSettings(env)).looksPageSize, env.PUBLIC_PAGE_SIZE_MAX);
  const filter = { status: 'published', ...(collectionId ? { collectionIds: collectionId } : {}) } as const;
  const [records, total] = await Promise.all([
    OutfitModel.find(filter)
      .sort({ featured: -1, updatedAt: -1, _id: -1 })
      .skip((query.page - 1) * size)
      .limit(size)
      .lean<OutfitRecord[]>(),
    OutfitModel.countDocuments(filter),
  ]);
  const resolveUrl = createMediaUrlResolver(env);
  return { items: records.map((record) => toPublicOutfitDto(toOutfit(record), resolveUrl)), total, page: query.page, size };
};
