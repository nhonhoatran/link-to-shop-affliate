import type { AdminStatsResponse } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { getAdminStatsRecentCount } from '../lib/runtime-defaults';
import { OutfitModel, type OutfitRecord } from '../models/outfit-model';
import { createMediaUrlResolver, toAdminListItem } from './outfit-mapper';

// Matches an outfit when any of its items still has an empty affiliate link.
const MISSING_AFFILIATE = { 'items.affiliateUrl': '' };

export const getAdminStats = async (env: Env): Promise<AdminStatsResponse> => {
  const [total, published, draft, publishedMissingAffiliate, draftMissingAffiliate, featured, recent] = await Promise.all([
    OutfitModel.countDocuments({}),
    OutfitModel.countDocuments({ status: 'published' }),
    OutfitModel.countDocuments({ status: 'draft' }),
    OutfitModel.countDocuments({ status: 'published', ...MISSING_AFFILIATE }),
    OutfitModel.countDocuments({ status: 'draft', ...MISSING_AFFILIATE }),
    OutfitModel.findOne({ featured: true, status: 'published' }).sort({ updatedAt: -1 }).lean<OutfitRecord>(),
    OutfitModel.find({}).sort({ updatedAt: -1, _id: -1 }).limit(getAdminStatsRecentCount()).lean<OutfitRecord[]>(),
  ]);
  const resolveUrl = createMediaUrlResolver(env);
  return {
    counts: { total, published, draft, publishedMissingAffiliate, draftMissingAffiliate },
    featured: featured ? toAdminListItem(featured, resolveUrl) : null,
    recent: recent.map((record) => toAdminListItem(record, resolveUrl)),
  };
};
