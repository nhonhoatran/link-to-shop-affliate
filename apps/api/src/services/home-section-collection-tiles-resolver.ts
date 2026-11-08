import type { HomeSection, ResolvedHomeSection } from '@under30ss/shared';
import { isObjectId } from '../lib/object-id';
import { CollectionModel, PUBLISHED_COLLECTION_FILTER, type CollectionRecord } from '../models/collection-model';
import { toPublicCollectionCard } from './collection-mapper';
import { orderByIds, type ResolveContext } from './home-section-resolve-context';

type CollectionTiles = Extract<HomeSection, { type: 'CollectionTiles' }>;

export const resolveCollectionTiles = async (
  section: CollectionTiles,
  { env, resolveUrl }: ResolveContext,
): Promise<ResolvedHomeSection | null> => {
  const { mode, collectionIds, count } = section.props;
  let records: CollectionRecord[];
  if (mode === 'manual') {
    const ids = collectionIds.filter(isObjectId);
    const found = await CollectionModel.find({ ...PUBLISHED_COLLECTION_FILTER, _id: { $in: ids } }).lean<CollectionRecord[]>();
    records = orderByIds(found, ids);
  } else {
    records = await CollectionModel.find(PUBLISHED_COLLECTION_FILTER)
      .sort({ order: 1, _id: 1 })
      .limit(Math.min(count, env.PUBLIC_PAGE_SIZE_MAX))
      .lean<CollectionRecord[]>();
  }
  if (records.length === 0) return null;
  return { ...section, data: { items: records.map((record) => toPublicCollectionCard(record, resolveUrl)) } };
};
