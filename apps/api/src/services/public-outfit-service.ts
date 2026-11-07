import { toPublicOutfitDto, type OutfitSlugsResponse, type PublicOutfitDto } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { OutfitModel, type OutfitRecord } from '../models/outfit-model';
import { createMediaUrlResolver, toOutfit } from './outfit-mapper';

export const getPublishedOutfitBySlug = async (slug: string, env: Env): Promise<PublicOutfitDto | null> => {
  const record = await OutfitModel.findOne({ slug, status: 'published' }).lean<OutfitRecord>();
  return record ? toPublicOutfitDto(toOutfit(record), createMediaUrlResolver(env)) : null;
};

export const getFeaturedOutfit = async (env: Env): Promise<PublicOutfitDto | null> => {
  const record = await OutfitModel.findOne({ featured: true, status: 'published' })
    .sort({ updatedAt: -1 })
    .lean<OutfitRecord>();
  return record ? toPublicOutfitDto(toOutfit(record), createMediaUrlResolver(env)) : null;
};

export const listPublishedSlugs = async (): Promise<OutfitSlugsResponse> => {
  const records = await OutfitModel.find({ status: 'published' })
    .select({ slug: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .lean<Pick<OutfitRecord, 'slug' | 'updatedAt'>[]>();
  return { items: records.map((record) => ({ slug: record.slug, updatedAt: record.updatedAt.toISOString() })) };
};
