import type { z } from 'zod';
import type {
  CollectionSlugsResponse,
  publicCollectionListQuerySchema,
  publicOutfitListQuerySchema,
  PublicCollectionListResponse,
  PublicCollectionPageResponse,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { CollectionModel, PUBLISHED_COLLECTION_FILTER, type CollectionRecord } from '../models/collection-model';
import { OutfitModel } from '../models/outfit-model';
import { toPublicCollection, toPublicCollectionCard } from './collection-mapper';
import { createMediaUrlResolver } from './outfit-mapper';
import { OUTFIT_CARD_FIELDS, toPublicOutfitCard, type OutfitCardRecord } from './public-outfit-service';
import { getListingSettings } from './settings-service';

const pageSize = async (requested: number | undefined, env: Env): Promise<number> =>
  Math.min(requested ?? (await getListingSettings(env)).looksPageSize, env.PUBLIC_PAGE_SIZE_MAX);

export const listPublishedCollections = async (
  query: z.output<typeof publicCollectionListQuerySchema>,
  env: Env,
): Promise<PublicCollectionListResponse> => {
  const size = await pageSize(query.size, env);
  const [records, total] = await Promise.all([
    CollectionModel.find(PUBLISHED_COLLECTION_FILTER)
      .sort({ order: 1, _id: 1 })
      .skip((query.page - 1) * size)
      .limit(size)
      .lean<CollectionRecord[]>(),
    CollectionModel.countDocuments(PUBLISHED_COLLECTION_FILTER),
  ]);
  const resolveUrl = createMediaUrlResolver(env);
  return { items: records.map((record) => toPublicCollectionCard(record, resolveUrl)), total, page: query.page, size };
};

export const listPublishedCollectionSlugs = async (): Promise<CollectionSlugsResponse> => {
  const records = await CollectionModel.find(PUBLISHED_COLLECTION_FILTER)
    .select({ slug: 1, updatedAt: 1 })
    .sort({ order: 1, _id: 1 })
    .lean<Pick<CollectionRecord, 'slug' | 'updatedAt'>[]>();
  return { items: records.map((record) => ({ slug: record.slug, updatedAt: record.updatedAt.toISOString() })) };
};

export const getPublishedCollectionPage = async (
  slug: string,
  query: z.output<typeof publicOutfitListQuerySchema>,
  env: Env,
): Promise<PublicCollectionPageResponse | null> => {
  const collection = await CollectionModel.findOne({ ...PUBLISHED_COLLECTION_FILTER, slug }).lean<CollectionRecord>();
  if (!collection) return null;
  const size = await pageSize(query.size, env);
  const filter = { status: 'published', collectionIds: collection._id } as const;
  const [records, total] = await Promise.all([
    OutfitModel.find(filter)
      .select(OUTFIT_CARD_FIELDS)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((query.page - 1) * size)
      .limit(size)
      .lean<OutfitCardRecord[]>(),
    OutfitModel.countDocuments(filter),
  ]);
  const resolveUrl = createMediaUrlResolver(env);
  return {
    collection: toPublicCollection(collection, resolveUrl),
    outfits: { items: records.map((record) => toPublicOutfitCard(record, resolveUrl)), total, page: query.page, size },
  };
};
