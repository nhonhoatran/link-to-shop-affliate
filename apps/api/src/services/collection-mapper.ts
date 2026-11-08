import type {
  AdminCollectionDto,
  AdminCollectionListItemDto,
  CollectionUsage,
  ImageRef,
  ImageWithUrl,
  PublicCollectionCardDto,
  PublicCollectionDto,
} from '@under30ss/shared';
import type { CollectionRecord } from '../models/collection-model';

type ResolveUrl = (key: string) => string;

const toImageWithUrl = ({ key, width, height }: ImageRef, resolveUrl: ResolveUrl): ImageWithUrl => ({
  key,
  width,
  height,
  url: resolveUrl(key),
});

export const toAdminCollectionListItem = (
  record: CollectionRecord,
  outfitCount: number,
  resolveUrl: ResolveUrl,
): AdminCollectionListItemDto => ({
  id: String(record._id),
  slug: record.slug,
  name: record.name,
  status: record.status,
  order: record.order,
  outfitCount,
  coverImageUrl: record.coverImage ? resolveUrl(record.coverImage.key) : null,
  updatedAt: record.updatedAt.toISOString(),
});

export const toAdminCollectionDto = (
  record: CollectionRecord,
  usage: CollectionUsage,
  resolveUrl: ResolveUrl,
): AdminCollectionDto => ({
  id: String(record._id),
  slug: record.slug,
  name: record.name,
  ...(record.description ? { description: record.description } : {}),
  ...(record.coverImage ? { coverImage: toImageWithUrl(record.coverImage, resolveUrl) } : {}),
  status: record.status,
  ...(record.seoDescription ? { seoDescription: record.seoDescription } : {}),
  order: record.order,
  usage,
});

/** Callers only pass records matching PUBLISHED_COLLECTION_FILTER, which guarantees a cover image. */
export const toPublicCollectionCard = (record: CollectionRecord, resolveUrl: ResolveUrl): PublicCollectionCardDto => ({
  slug: record.slug,
  name: record.name,
  ...(record.description ? { description: record.description } : {}),
  coverImage: toImageWithUrl(record.coverImage as ImageRef, resolveUrl),
});

export const toPublicCollection = (record: CollectionRecord, resolveUrl: ResolveUrl): PublicCollectionDto => ({
  ...toPublicCollectionCard(record, resolveUrl),
  ...(record.seoDescription ? { seoDescription: record.seoDescription } : {}),
});
