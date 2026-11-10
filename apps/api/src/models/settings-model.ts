import { Schema, model } from 'mongoose';
import { HOME_MODES, type AnnouncementInput, type FooterInput, type HomeMode, type ImageRef, type NewsletterConsentInput } from '@under30ss/shared';

export interface SettingsDoc {
  singleton: 'site';
  siteName: string;
  seoTitle: string;
  seoDescription: string;
  ogImage?: ImageRef;
  uploadMaxMb?: number;
  looksPageSize?: number;
  relatedOutfitsCount?: number;
  collectionsNavEnabled?: boolean;
  collectionsLabel?: string;
  homeMode?: HomeMode;
  footer?: FooterInput;
  announcement?: AnnouncementInput;
  newsletterConsent?: NewsletterConsentInput;
  /** Bumped by the API when the sentence or link changes; never taken from the request. */
  newsletterConsentVersion?: number;
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
    looksPageSize: Number,
    relatedOutfitsCount: Number,
    collectionsNavEnabled: Boolean,
    collectionsLabel: String,
    homeMode: { type: String, enum: HOME_MODES },
    // Validated by the shared zod schemas before every write.
    footer: Schema.Types.Mixed,
    announcement: Schema.Types.Mixed,
    newsletterConsent: Schema.Types.Mixed,
    newsletterConsentVersion: Number,
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const SettingsModel = model<SettingsDoc>('Settings', settingsSchema);
