import type { HomeSection, OutfitListTabData, PublicOutfitCardDto, ResolvedHomeSection } from '@under30ss/shared';
import { COLLECTIONS_PAGE_PATH, LOOKS_PAGE_PATH } from '@under30ss/shared';
import { isObjectId } from '../lib/object-id';
import { CollectionModel, PUBLISHED_COLLECTION_FILTER, type CollectionRecord } from '../models/collection-model';
import { OutfitModel } from '../models/outfit-model';
import { orderByIds, type ResolveContext } from './home-section-resolve-context';
import { OUTFIT_CARD_FIELDS, toPublicOutfitCard, type OutfitCardRecord } from './public-outfit-service';

type OutfitList = Extract<HomeSection, { type: 'OutfitList' }>;

export const latestRecords = (filter: Record<string, unknown>, limit: number): Promise<OutfitCardRecord[]> =>
  OutfitModel.find({ status: 'published', ...filter })
    .select(OUTFIT_CARD_FIELDS)
    .sort({ updatedAt: -1, _id: -1 })
    .limit(limit)
    .lean<OutfitCardRecord[]>();

/** Mirrors the related-outfits rule on the look page: ask for one extra, drop the featured outfit, trim. */
const dropFeatured = async (cards: PublicOutfitCardDto[], count: number, ctx: ResolveContext) => {
  const featured = await ctx.featured();
  return cards.filter((card) => card.slug !== featured?.slug).slice(0, count);
};

const latestTab = async (count: number, ctx: ResolveContext): Promise<OutfitListTabData[]> => {
  const records = await latestRecords({}, count + 1);
  return [{ key: 'latest', href: LOOKS_PAGE_PATH, items: records.map((record) => toPublicOutfitCard(record, ctx.resolveUrl)) }];
};

export const manualRecords = async (outfitIds: string[]): Promise<OutfitCardRecord[]> => {
  const ids = outfitIds.filter(isObjectId);
  const found = await OutfitModel.find({ status: 'published', _id: { $in: ids } })
    .select(OUTFIT_CARD_FIELDS)
    .lean<(OutfitCardRecord & { _id: unknown })[]>();
  return orderByIds(found, ids);
};

const manualTab = async (section: OutfitList, ctx: ResolveContext): Promise<OutfitListTabData[]> => {
  const records = await manualRecords(section.props.outfitIds);
  return [{ key: 'manual', items: records.map((record) => toPublicOutfitCard(record, ctx.resolveUrl)) }];
};

const collectionTabs = async (section: OutfitList, count: number, ctx: ResolveContext): Promise<OutfitListTabData[]> => {
  const ids = section.props.collectionIds.filter(isObjectId);
  const found = await CollectionModel.find({ ...PUBLISHED_COLLECTION_FILTER, _id: { $in: ids } }).lean<CollectionRecord[]>();
  return Promise.all(
    orderByIds(found, ids).map(async (collection) => {
      const records = await latestRecords({ collectionIds: collection._id }, count + 1);
      return {
        key: String(collection._id),
        label: collection.name,
        href: `${COLLECTIONS_PAGE_PATH}/${collection.slug}`,
        items: records.map((record) => toPublicOutfitCard(record, ctx.resolveUrl)),
      };
    }),
  );
};

export const resolveOutfitList = async (section: OutfitList, ctx: ResolveContext): Promise<ResolvedHomeSection | null> => {
  const { source, excludeFeatured } = section.props;
  const ceiling = ctx.env.PUBLIC_PAGE_SIZE_MAX;
  // A hand-picked list shows everything that was picked unless the admin set an explicit count.
  const count = Math.min(section.props.count ?? (source === 'manual' ? ceiling : ctx.listing.relatedOutfitsCount), ceiling);
  const tabs =
    source === 'manual'
      ? await manualTab(section, ctx)
      : source === 'collection'
        ? await collectionTabs(section, count, ctx)
        : await latestTab(count, ctx);
  const trimmed = await Promise.all(
    tabs.map(async (tab) => ({
      ...tab,
      items: excludeFeatured ? await dropFeatured(tab.items, count, ctx) : tab.items.slice(0, count),
    })),
  );
  const filled = trimmed.filter((tab) => tab.items.length > 0);
  return filled.length > 0 ? { ...section, data: { tabs: filled } } : null;
};
