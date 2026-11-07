import type { AdminOutfitListItemDto } from './api-contract';

export interface AdminStatsCounts {
  total: number;
  published: number;
  draft: number;
  publishedMissingAffiliate: number;
  draftMissingAffiliate: number;
}

export interface AdminStatsResponse {
  counts: AdminStatsCounts;
  featured: AdminOutfitListItemDto | null;
  recent: AdminOutfitListItemDto[];
}
