import type { z } from 'zod';
import {
  toPublicOutfitDto,
  type OutfitSlugsResponse,
  type PublicOutfitDto,
  type PublicOutfitListResponse,
  type publicOutfitListQuerySchema,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { OutfitModel, type OutfitRecord } from '../models/outfit-model';
import { createMediaUrlResolver, toOutfit } from './outfit-mapper';
import { getListingSettings } from './settings-service';

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

export const listPublishedOutfitCards = async (
  query: z.output<typeof publicOutfitListQuerySchema>,
  env: Env,
): Promise<PublicOutfitListResponse> => {
  const size = Math.min(query.size ?? (await getListingSettings(env)).looksPageSize, env.PUBLIC_PAGE_SIZE_MAX);
  const filter = { status: 'published' } as const;
  const [records, total] = await Promise.all([
    OutfitModel.find(filter)
      .select({ slug: 1, title: 1, modelImage: 1, updatedAt: 1 })
      .sort({ updatedAt: -1, _id: -1 })
      .skip((query.page - 1) * size)
      .limit(size)
      .lean<Pick<OutfitRecord, 'slug' | 'title' | 'modelImage' | 'updatedAt'>[]>(),
    OutfitModel.countDocuments(filter),
  ]);
  const resolveUrl = createMediaUrlResolver(env);
  const items = records.map((record) => ({
    slug: record.slug,
    title: record.title,
    modelImage: {
      key: record.modelImage.key,
      width: record.modelImage.width,
      height: record.modelImage.height,
      url: resolveUrl(record.modelImage.key),
    },
    updatedAt: record.updatedAt.toISOString(),
  }));
  return { items, total, page: query.page, size };
};
