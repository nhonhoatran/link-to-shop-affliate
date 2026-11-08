import type { HomeSection, ResolvedHomeSection } from '@under30ss/shared';
import { MAX_GALLERY_ITEMS } from '@under30ss/shared';
import { isObjectId } from '../lib/object-id';
import { CollectionModel, PUBLISHED_COLLECTION_FILTER } from '../models/collection-model';
import type { ResolveContext } from './home-section-resolve-context';
import { latestRecords, manualRecords } from './home-section-outfit-list-resolver';
import { toPublicOutfitCard, type OutfitCardRecord } from './public-outfit-service';

export type GallerySection = Extract<HomeSection, { type: 'Gallery' }>;

export const isLatestGallery = (section: HomeSection): section is GallerySection =>
  section.type === 'Gallery' && section.props.source === 'latest';

const collectionRecords = async (section: GallerySection, limit: number): Promise<OutfitCardRecord[]> => {
  const id = section.props.collectionIds.find(isObjectId);
  if (!id || !(await CollectionModel.exists({ ...PUBLISHED_COLLECTION_FILTER, _id: id }))) return [];
  return latestRecords({ collectionIds: id }, limit);
};

/**
 * `exclude` holds slugs already shown by an outfit list on the same page. A `latest` gallery asks for that many extra
 * records, so dropping the overlap still leaves a full set.
 */
export const resolveGallery = async (
  section: GallerySection,
  ctx: ResolveContext,
  exclude: ReadonlySet<string> = new Set(),
): Promise<ResolvedHomeSection | null> => {
  const { source, count: requested, outfitIds } = section.props;
  const count = Math.min(requested, MAX_GALLERY_ITEMS, ctx.env.PUBLIC_PAGE_SIZE_MAX);
  const records =
    source === 'manual'
      ? await manualRecords(outfitIds)
      : source === 'collection'
        ? await collectionRecords(section, count)
        : (await latestRecords({}, count + exclude.size)).filter((record) => !exclude.has(record.slug));
  const items = records.slice(0, count).map((record) => toPublicOutfitCard(record, ctx.resolveUrl));
  return items.length > 0 ? { ...section, data: { items } } : null;
};
