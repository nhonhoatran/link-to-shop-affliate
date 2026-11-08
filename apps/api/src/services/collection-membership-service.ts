import type { Types } from 'mongoose';
import { MAX_COLLECTIONS_PER_OUTFIT, type CollectionMoveRequest } from '@under30ss/shared';
import { badRequest, notFound } from '../lib/app-error';
import { isObjectId } from '../lib/object-id';
import { CollectionModel } from '../models/collection-model';
import { OutfitModel } from '../models/outfit-model';

export const assertCollectionsExist = async (ids: string[]): Promise<void> => {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  if ((await CollectionModel.countDocuments({ _id: { $in: unique } })) !== unique.length) {
    throw badRequest('Có bộ sưu tập không tồn tại', { collectionIds: 'Có bộ sưu tập không tồn tại' });
  }
};

export const assertOutfitsExist = async (ids: string[]): Promise<void> => {
  const unique = [...new Set(ids)];
  if ((await OutfitModel.countDocuments({ _id: { $in: unique } })) !== unique.length) {
    throw badRequest('Có outfit không tồn tại', { outfitIds: 'Có outfit không tồn tại' });
  }
};

// Membership writes must not bump `updatedAt`: public outfit lists sort by it.
const MEMBERSHIP_WRITE = { timestamps: false } as const;

// Matches outfits whose collection list is already full.
const FULL_LIST_FIELD = `collectionIds.${MAX_COLLECTIONS_PER_OUTFIT - 1}`;

const assertRoomForCollection = async (collectionId: string, outfitIds: string[]): Promise<void> => {
  const full = await OutfitModel.countDocuments({
    _id: { $in: outfitIds },
    collectionIds: { $ne: collectionId },
    [FULL_LIST_FIELD]: { $exists: true },
  });
  if (full === 0) return;
  const message = `Có ${full} outfit đã thuộc tối đa ${MAX_COLLECTIONS_PER_OUTFIT} bộ sưu tập, không thể thêm. Gỡ bớt bộ sưu tập khỏi outfit đó rồi thử lại`;
  throw badRequest(message, { outfitIds: message });
};

/** All-or-nothing: if any outfit is already at the collection limit the request fails and nothing is added. */
export const addOutfitsToCollection = async (collectionId: string, outfitIds: string[]): Promise<boolean> => {
  if (!isObjectId(collectionId) || !(await CollectionModel.exists({ _id: collectionId }))) return false;
  await assertOutfitsExist(outfitIds);
  await assertRoomForCollection(collectionId, outfitIds);
  await OutfitModel.updateMany(
    { _id: { $in: outfitIds }, $or: [{ collectionIds: collectionId }, { [FULL_LIST_FIELD]: { $exists: false } }] },
    { $addToSet: { collectionIds: collectionId } },
    MEMBERSHIP_WRITE,
  );
  // A delete that ran between the check above and the write would leave dead ids on the outfits.
  if (!(await CollectionModel.exists({ _id: collectionId }))) {
    await detachCollectionFromOutfits(collectionId);
    return false;
  }
  return true;
};

export const removeOutfitFromCollection = async (collectionId: string, outfitId: string): Promise<boolean> => {
  if (!isObjectId(collectionId) || !isObjectId(outfitId) || !(await CollectionModel.exists({ _id: collectionId }))) {
    return false;
  }
  await OutfitModel.updateOne({ _id: outfitId }, { $pull: { collectionIds: collectionId } }, MEMBERSHIP_WRITE);
  return true;
};

export const detachCollectionFromOutfits = async (collectionId: string): Promise<void> => {
  await OutfitModel.updateMany({ collectionIds: collectionId }, { $pull: { collectionIds: collectionId } }, MEMBERSHIP_WRITE);
};

/**
 * Swaps with the neighbour in (order, _id) sequence by renumbering the whole list, which also repairs duplicate
 * `order` values left by concurrent creates. The list is admin-curated, so it stays small.
 */
export const moveCollection = async (id: string, direction: CollectionMoveRequest['direction']): Promise<void> => {
  if (!isObjectId(id)) throw notFound('Không tìm thấy bộ sưu tập');
  const all = await CollectionModel.find().sort({ order: 1, _id: 1 }).select({ order: 1 }).lean<{ _id: Types.ObjectId; order: number }[]>();
  const index = all.findIndex((entry) => String(entry._id) === id);
  if (index < 0) throw notFound('Không tìm thấy bộ sưu tập');
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= all.length) return;
  [all[index], all[target]] = [all[target]!, all[index]!];
  const writes = all.flatMap((entry, position) =>
    entry.order === position ? [] : [{ updateOne: { filter: { _id: entry._id }, update: { $set: { order: position } } } }],
  );
  if (writes.length > 0) await CollectionModel.bulkWrite(writes, MEMBERSHIP_WRITE);
};

export const countOutfitsByCollection = async (ids: Types.ObjectId[]): Promise<Map<string, number>> => {
  if (ids.length === 0) return new Map();
  const rows = await OutfitModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { collectionIds: { $in: ids } } },
    { $unwind: '$collectionIds' },
    { $match: { collectionIds: { $in: ids } } },
    { $group: { _id: '$collectionIds', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
};
