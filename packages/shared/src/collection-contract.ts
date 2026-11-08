import { z } from 'zod';
import { MAX_LIST_PAGE, type Paginated } from './api-contract';
import type { CollectionInput } from './collection-schemas';
import { objectIdSchema } from './object-id-schema';
import { outfitStatusSchema, type ImageWithUrl, type OutfitStatus } from './outfit-schemas';
import type { PublicOutfitCardDto } from './public-outfit-list-contract';

// Default label; the `collectionsLabel` setting overrides it.
export const DEFAULT_COLLECTIONS_LABEL = 'Bộ sưu tập';

// Technical guard on one add-outfits request.
export const MAX_COLLECTION_OUTFITS_PER_REQUEST = 48;

export const adminCollectionListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: outfitStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(MAX_LIST_PAGE).default(1),
  // Default and maximum are enforced by the API from ADMIN_PAGE_SIZE_* env.
  size: z.coerce.number().int().min(1).optional(),
});
export type AdminCollectionListQuery = z.input<typeof adminCollectionListQuerySchema>;

export const collectionMoveRequestSchema = z.object({ direction: z.enum(['up', 'down']) });
export type CollectionMoveRequest = z.infer<typeof collectionMoveRequestSchema>;

export const collectionOutfitsRequestSchema = z.object({
  outfitIds: z.array(objectIdSchema).min(1).max(MAX_COLLECTION_OUTFITS_PER_REQUEST),
});
export type CollectionOutfitsRequest = z.infer<typeof collectionOutfitsRequestSchema>;

// Page size comes from the `looksPageSize` setting, like the outfit list.
export const publicCollectionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_LIST_PAGE).default(1),
  size: z.coerce.number().int().min(1).optional(),
});
export type PublicCollectionListQuery = z.input<typeof publicCollectionListQuerySchema>;

export interface AdminCollectionListItemDto {
  id: string;
  slug: string;
  name: string;
  status: OutfitStatus;
  order: number;
  outfitCount: number;
  coverImageUrl: string | null;
  updatedAt: string;
}
export type AdminCollectionListResponse = Paginated<AdminCollectionListItemDto>;

export interface CollectionUsage {
  outfitCount: number;
  usedInDraft: boolean;
  usedInPublished: boolean;
}

export type AdminCollectionDto = Omit<CollectionInput, 'coverImage'> & {
  id: string;
  order: number;
  coverImage?: ImageWithUrl;
  usage: CollectionUsage;
};

export type CreateCollectionRequest = CollectionInput;
export type UpdateCollectionRequest = CollectionInput;
export type CollectionResponse = AdminCollectionDto;

export interface PublicCollectionCardDto {
  slug: string;
  name: string;
  description?: string;
  coverImage: ImageWithUrl;
}
export type PublicCollectionListResponse = Paginated<PublicCollectionCardDto>;

export type PublicCollectionDto = PublicCollectionCardDto & { seoDescription?: string };

export interface PublicCollectionPageResponse {
  collection: PublicCollectionDto;
  outfits: Paginated<PublicOutfitCardDto>;
}

export interface CollectionSlugsResponse {
  items: { slug: string; updatedAt: string }[];
}
