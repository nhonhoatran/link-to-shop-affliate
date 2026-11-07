import { z } from 'zod';
import { MAX_LIST_PAGE, type Paginated } from './api-contract';
import type { ImageWithUrl } from './outfit-schemas';

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
