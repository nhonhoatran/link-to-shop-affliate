import type { Types } from 'mongoose';
import { conflict } from '../lib/app-error';
import { CollectionModel } from '../models/collection-model';
import { OutfitModel } from '../models/outfit-model';
import type { ImportOperationRecord } from '../models/import-operation-model';

interface EntityIdentity { _id: Types.ObjectId; importReference?: string }

/** A missing stage receipt never proves an entity was not written before a crash. */
export const reconcileImportOperations = async (records: ImportOperationRecord[]): Promise<ImportOperationRecord[]> => {
  if (records.length === 0) return records;
  const [collections, outfits] = await Promise.all([
    CollectionModel.find({ _id: { $in: records.map((record) => record.collectionId) } }).select('_id importReference').lean<EntityIdentity[]>(),
    OutfitModel.find({ _id: { $in: records.map((record) => record.outfitId) } }).select('_id importReference').lean<EntityIdentity[]>(),
  ]);
  const byCollectionId = new Map(collections.map((record) => [String(record._id), record]));
  const byOutfitId = new Map(outfits.map((record) => [String(record._id), record]));
  return records.map((record) => {
    const collection = byCollectionId.get(String(record.collectionId));
    const outfit = byOutfitId.get(String(record.outfitId));
    const reference = String(record._id);
    if ((collection && collection.importReference !== reference) || (outfit && outfit.importReference !== reference)) {
      throw conflict('Danh tính kết quả nhập không khớp; cần kiểm tra trên máy chủ');
    }
    return { ...record, collectionCreated: record.collectionCreated || Boolean(collection), outfitCreated: record.outfitCreated || Boolean(outfit) };
  });
};
