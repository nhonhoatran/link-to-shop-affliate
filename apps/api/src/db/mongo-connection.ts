import mongoose from 'mongoose';
import { AdminUserModel } from '../models/admin-user-model';
import { OutfitModel } from '../models/outfit-model';
import { SettingsModel } from '../models/settings-model';

export const connectMongo = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await Promise.all([OutfitModel.init(), AdminUserModel.init(), SettingsModel.init()]);
  await ensureOutfitIndexes();
};

/**
 * The partial unique index on `featured` is what keeps a single featured outfit, so a failed build must stop startup
 * (e.g. existing duplicates) instead of being swallowed by autoIndex.
 */
export const ensureOutfitIndexes = async (): Promise<void> => {
  try {
    await OutfitModel.createIndexes();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to build outfit indexes (check for duplicate featured outfits): ${reason}`, { cause: error });
  }
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};
