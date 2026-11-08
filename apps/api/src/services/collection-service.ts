import type { z } from 'zod';
import type {
  adminCollectionListQuerySchema,
  AdminCollectionDto,
  AdminCollectionListResponse,
  CollectionInput,
  CollectionUsage,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { badRequest, conflict } from '../lib/app-error';
import { isObjectId } from '../lib/object-id';
import { isPublicKey, PUBLIC_KEY_ERROR } from '../lib/public-key-prefix';
import { CollectionModel, type CollectionRecord } from '../models/collection-model';
import { OutfitModel } from '../models/outfit-model';
import { toAdminCollectionDto, toAdminCollectionListItem } from './collection-mapper';
import { countOutfitsByCollection, detachCollectionFromOutfits } from './collection-membership-service';
import { loadHomeLayout, parseStoredContent } from './home-layout-service';
import { createMediaUrlResolver } from './outfit-mapper';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SLUG_TAKEN = 'Slug đã được dùng cho bộ sưu tập khác';
const isDuplicateKey = (error: unknown): boolean => (error as { code?: number }).code === 11000;

const assertCoverKey = (input: CollectionInput): void => {
  if (input.coverImage && !isPublicKey(input.coverImage.key)) {
    throw badRequest('Ảnh không hợp lệ', { 'coverImage.key': PUBLIC_KEY_ERROR });
  }
};

const withSlugConflict = async <T>(write: () => Promise<T>): Promise<T> => {
  try {
    return await write();
  } catch (error) {
    if (isDuplicateKey(error)) throw conflict(SLUG_TAKEN, { slug: SLUG_TAKEN });
    throw error;
  }
};

const referencesCollection = (content: unknown, id: string): boolean =>
  parseStoredContent(content).some(
    (section) =>
      (section.type === 'CollectionTiles' || section.type === 'OutfitList') && section.props.collectionIds.includes(id),
  );

const collectionUsage = async (id: string): Promise<CollectionUsage> => {
  const [outfitCount, layout] = await Promise.all([OutfitModel.countDocuments({ collectionIds: id }), loadHomeLayout()]);
  return {
    outfitCount,
    usedInDraft: layout ? referencesCollection(layout.draft.content, id) : false,
    usedInPublished: layout?.published ? referencesCollection(layout.published.content, id) : false,
  };
};

export const listAdminCollections = async (
  query: z.output<typeof adminCollectionListQuerySchema>,
  env: Env,
): Promise<AdminCollectionListResponse> => {
  const size = Math.min(query.size ?? env.ADMIN_PAGE_SIZE_DEFAULT, env.ADMIN_PAGE_SIZE_MAX);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: pattern }, { slug: pattern }];
  }
  const [records, total] = await Promise.all([
    CollectionModel.find(filter)
      .sort({ order: 1, _id: 1 })
      .skip((query.page - 1) * size)
      .limit(size)
      .lean<CollectionRecord[]>(),
    CollectionModel.countDocuments(filter),
  ]);
  const counts = await countOutfitsByCollection(records.map((record) => record._id));
  const resolveUrl = createMediaUrlResolver(env);
  const items = records.map((record) => toAdminCollectionListItem(record, counts.get(String(record._id)) ?? 0, resolveUrl));
  return { items, total, page: query.page, size };
};

export const getAdminCollection = async (id: string, env: Env): Promise<AdminCollectionDto | null> => {
  if (!isObjectId(id)) return null;
  const record = await CollectionModel.findById(id).lean<CollectionRecord>();
  if (!record) return null;
  return toAdminCollectionDto(record, await collectionUsage(id), createMediaUrlResolver(env));
};

export const createCollection = async (input: CollectionInput, env: Env): Promise<AdminCollectionDto> => {
  assertCoverKey(input);
  const last = await CollectionModel.findOne().sort({ order: -1 }).select({ order: 1 }).lean<{ order: number }>();
  const created = await withSlugConflict(() => CollectionModel.create({ ...input, order: (last?.order ?? -1) + 1 }));
  const usage = { outfitCount: 0, usedInDraft: false, usedInPublished: false };
  return toAdminCollectionDto(created.toObject() as CollectionRecord, usage, createMediaUrlResolver(env));
};

/** `previousSlug` lets the caller refresh the old public URL after a rename. */
export const updateCollection = async (
  id: string,
  input: CollectionInput,
  env: Env,
): Promise<{ collection: AdminCollectionDto; previousSlug: string } | null> => {
  assertCoverKey(input);
  if (!isObjectId(id)) return null;
  const existing = await CollectionModel.findById(id).select({ slug: 1 }).lean<{ slug: string }>();
  if (!existing) return null;
  const { description, coverImage, seoDescription, ...required } = input;
  const set: Record<string, unknown> = { ...required };
  const unset: Record<string, 1> = {};
  for (const [key, value] of Object.entries({ description, coverImage, seoDescription })) {
    if (value === undefined || value === '') unset[key] = 1;
    else set[key] = value;
  }
  const updated = await withSlugConflict(() =>
    CollectionModel.findByIdAndUpdate(
      id,
      { $set: set, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) },
      { returnDocument: 'after', runValidators: true },
    ).lean<CollectionRecord>(),
  );
  if (!updated) return null;
  return {
    collection: toAdminCollectionDto(updated, await collectionUsage(id), createMediaUrlResolver(env)),
    previousSlug: existing.slug,
  };
};

/** Home sections keep the dead id; the resolver skips ids that no longer exist. */
export const deleteCollection = async (id: string): Promise<CollectionRecord | null> => {
  if (!isObjectId(id)) return null;
  const record = await CollectionModel.findByIdAndDelete(id).lean<CollectionRecord>();
  if (record) await detachCollectionFromOutfits(id);
  return record;
};
