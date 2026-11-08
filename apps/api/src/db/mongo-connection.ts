import mongoose from 'mongoose';
import { AdminUserModel } from '../models/admin-user-model';
import { CollectionModel } from '../models/collection-model';
import { OutfitModel } from '../models/outfit-model';
import { PageLayoutModel } from '../models/page-layout-model';
import { SettingsModel } from '../models/settings-model';

export const connectMongo = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await Promise.all([
    OutfitModel.init(),
    AdminUserModel.init(),
    SettingsModel.init(),
    CollectionModel.init(),
    PageLayoutModel.init(),
  ]);
  await ensureContentIndexes();
};

/**
 * The partial unique index on `featured` is what keeps a single featured outfit, and the unique collection slug and
 * page key keep URLs and layouts unambiguous, so a failed build must stop startup (e.g. existing duplicates)
 * instead of being swallowed by autoIndex.
 */
export const ensureContentIndexes = async (): Promise<void> => {
  try {
    await Promise.all([OutfitModel.createIndexes(), CollectionModel.createIndexes(), PageLayoutModel.createIndexes()]);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to build content indexes (check for duplicate featured outfits or slugs): ${reason}`, {
      cause: error,
    });
  }
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};
