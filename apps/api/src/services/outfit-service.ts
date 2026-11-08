import type { z } from 'zod';
import type {
  adminOutfitListQuerySchema,
  AdminOutfitListResponse,
  ImageRef,
  Outfit,
  OutfitInput,
  UpdateOutfitRequest,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { badRequest, conflict } from '../lib/app-error';
import { isObjectId } from '../lib/object-id';
import { isPublicKey, PUBLIC_KEY_ERROR } from '../lib/public-key-prefix';
import { OutfitModel, type OutfitRecord } from '../models/outfit-model';
import { assertCollectionsExist } from './collection-membership-service';
import { createMediaUrlResolver, toAdminListItem, toOutfit } from './outfit-mapper';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Anonymous read is only granted to the public/ prefix, so no other key may be referenced. */
export const assertPublicImageKeys = (modelImage: ImageRef, items: { image: ImageRef }[]): void => {
  const fields: Record<string, string> = {};
  if (!isPublicKey(modelImage.key)) fields['modelImage.key'] = PUBLIC_KEY_ERROR;
  items.forEach((item, index) => {
    if (!isPublicKey(item.image.key)) fields[`items.${index}.image.key`] = PUBLIC_KEY_ERROR;
  });
  if (Object.keys(fields).length > 0) throw badRequest('Ảnh không hợp lệ', fields);
};

export const listAdminOutfits = async (
  query: z.output<typeof adminOutfitListQuerySchema>,
  env: Env,
): Promise<AdminOutfitListResponse> => {
  const size = Math.min(query.size ?? env.ADMIN_PAGE_SIZE_DEFAULT, env.ADMIN_PAGE_SIZE_MAX);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.collectionId) filter.collectionIds = query.collectionId;
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ title: pattern }, { slug: pattern }];
  }
  const [records, total] = await Promise.all([
    OutfitModel.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((query.page - 1) * size)
      .limit(size)
      .lean<OutfitRecord[]>(),
    OutfitModel.countDocuments(filter),
  ]);
  const resolveUrl = createMediaUrlResolver(env);
  return { items: records.map((record) => toAdminListItem(record, resolveUrl)), total, page: query.page, size };
};

export const findOutfitById = async (id: string): Promise<Outfit | null> => {
  if (!isObjectId(id)) return null;
  const record = await OutfitModel.findById(id).lean<OutfitRecord>();
  return record ? toOutfit(record) : null;
};

const FEATURED_DRAFT_MESSAGE = 'Chỉ đặt nổi bật cho outfit đã đăng';
const FEATURED_RACE_MESSAGE = 'Outfit nổi bật vừa được thay đổi ở nơi khác, vui lòng thử lại';

const isDuplicateKey = (error: unknown): boolean => (error as { code?: number }).code === 11000;

/** Sets the flag only while the outfit is still published, in one atomic write. */
const setFeaturedIfPublished = (id: string): Promise<OutfitRecord | null> =>
  OutfitModel.findOneAndUpdate({ _id: id, status: 'published' }, { $set: { featured: true } }, { returnDocument: 'after' }).lean<OutfitRecord>();

/**
 * At most one featured outfit (partial unique index). Featuring tries the conditional write first and
 * only clears the previous featured outfit once the unique index reports a clash, so an unknown or draft
 * target never clears the current one.
 */
export const applyFeatured = async (id: string, featured: boolean): Promise<Outfit | null> => {
  if (!isObjectId(id)) return null;
  if (!featured) {
    const record = await OutfitModel.findByIdAndUpdate(id, { $set: { featured: false } }, { returnDocument: 'after' }).lean<OutfitRecord>();
    return record ? toOutfit(record) : null;
  }
  let record: OutfitRecord | null;
  try {
    try {
      record = await setFeaturedIfPublished(id);
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      await OutfitModel.updateMany({ _id: { $ne: id }, featured: true }, { $set: { featured: false } });
      record = await setFeaturedIfPublished(id);
    }
  } catch (error) {
    // A concurrent request featured another outfit between our clear and write.
    if (isDuplicateKey(error)) throw conflict(FEATURED_RACE_MESSAGE);
    throw error;
  }
  if (record) return toOutfit(record);
  if (await OutfitModel.exists({ _id: id })) throw conflict(FEATURED_DRAFT_MESSAGE, { featured: FEATURED_DRAFT_MESSAGE });
  return null;
};

export const createOutfit = async (input: OutfitInput): Promise<Outfit> => {
  assertPublicImageKeys(input.modelImage, input.items);
  await assertCollectionsExist(input.collectionIds ?? []);
  if (input.featured && input.status !== 'published') {
    throw conflict(FEATURED_DRAFT_MESSAGE, { featured: FEATURED_DRAFT_MESSAGE });
  }
  const created = await OutfitModel.create({ ...input, featured: false });
  if (input.featured) return (await applyFeatured(String(created._id), true)) ?? toOutfit(created.toObject() as OutfitRecord);
  return toOutfit(created.toObject() as OutfitRecord);
};

/** The featured flag is not part of the update: only applyFeatured sets it, and unpublishing clears it. */
export const updateOutfit = async (
  id: string,
  input: UpdateOutfitRequest,
): Promise<{ outfit: Outfit; previousSlug: string } | null> => {
  assertPublicImageKeys(input.modelImage, input.items);
  await assertCollectionsExist(input.collectionIds ?? []);
  const existing = await findOutfitById(id);
  if (!existing) return null;
  const updated = await OutfitModel.findByIdAndUpdate(
    id,
    { $set: input.status === 'draft' ? { ...input, featured: false } : input },
    { returnDocument: 'after', runValidators: true },
  ).lean<OutfitRecord>();
  return updated ? { outfit: toOutfit(updated), previousSlug: existing.slug } : null;
};

export const deleteOutfit = async (id: string): Promise<Outfit | null> => {
  if (!isObjectId(id)) return null;
  const record = await OutfitModel.findByIdAndDelete(id).lean<OutfitRecord>();
  return record ? toOutfit(record) : null;
};

/** Seed path: the publish rule is intentionally bypassed by callers that decide the status themselves. */
export const upsertOutfitBySlug = async (input: OutfitInput): Promise<Outfit> => {
  assertPublicImageKeys(input.modelImage, input.items);
  const { featured, ...rest } = input;
  const wantFeatured = featured && rest.status === 'published';
  const record = await OutfitModel.findOneAndUpdate(
    { slug: input.slug },
    { $set: rest, $setOnInsert: { featured: false } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  ).lean<OutfitRecord>();
  const outfit = toOutfit(record);
  if (wantFeatured !== outfit.featured) return (await applyFeatured(outfit.id, wantFeatured)) ?? outfit;
  return outfit;
};
