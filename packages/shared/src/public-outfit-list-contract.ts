import { z } from 'zod';
import { MAX_LIST_PAGE, type Paginated } from './api-contract';
import { collectionSlugSchema } from './collection-schemas';
import type { ImageWithUrl } from './outfit-schemas';
import type { PublicOutfitDto } from './public-outfit-dto';

export const publicOutfitListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_LIST_PAGE).default(1),
  // Default and maximum are enforced by the API from settings and PUBLIC_PAGE_SIZE_MAX.
  size: z.coerce.number().int().min(1).optional(),
});
export type PublicOutfitListQuery = z.input<typeof publicOutfitListQuerySchema>;

export interface PublicOutfitCardDto {
  slug: string;
  title: string;
  modelImage: ImageWithUrl;
  updatedAt: string;
}

export type PublicOutfitListResponse = Paginated<PublicOutfitCardDto>;

/** Full lookbooks for the swipe feed, featured first. `collection` limits it to one published collection. */
export const publicOutfitFeedQuerySchema = publicOutfitListQuerySchema.extend({
  collection: collectionSlugSchema.optional(),
});
export type PublicOutfitFeedQuery = z.input<typeof publicOutfitFeedQuerySchema>;

export type PublicOutfitFeedResponse = Paginated<PublicOutfitDto>;
