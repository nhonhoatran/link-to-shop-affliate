import mongoose from 'mongoose';
import { AdminUserModel } from '../models/admin-user-model';
import { OutfitModel } from '../models/outfit-model';
import { SettingsModel } from '../models/settings-model';

export const connectMongo = async (uri: string): Promise<void> => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await Promise.all([OutfitModel.init(), AdminUserModel.init(), SettingsModel.init()]);
};

export const disconnectMongo = async (): Promise<void> => {
  await mongoose.disconnect();
};
