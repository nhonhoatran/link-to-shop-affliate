import { Schema, model } from 'mongoose';
import type { ImageRef } from '@under30ss/shared';

export interface SettingsDoc {
  singleton: 'site';
  siteName: string;
  seoTitle: string;
  seoDescription: string;
  ogImage?: ImageRef;
  uploadMaxMb?: number;
  updatedAt: Date;
}

const settingsSchema = new Schema<SettingsDoc>(
  {
    singleton: { type: String, enum: ['site'], default: 'site', unique: true },
    siteName: { type: String, required: true },
    seoTitle: { type: String, required: true },
    seoDescription: { type: String, default: '' },
    ogImage: new Schema<ImageRef>(
      { key: String, width: Number, height: Number },
      { _id: false },
    ),
    uploadMaxMb: Number,
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const SettingsModel = model<SettingsDoc>('Settings', settingsSchema);
