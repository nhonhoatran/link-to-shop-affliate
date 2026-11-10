import { Schema, model, type Types } from 'mongoose';
import type { Anchor, ImageRef, OutfitStatus } from '@under30ss/shared';

export interface OutfitItemDoc {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  image: ImageRef;
  side: 'left' | 'right';
  order: number;
  anchor?: Anchor;
  affiliateUrl: string;
}

export interface OutfitDoc {
  slug: string;
  title: string;
  seoDescription?: string;
  modelImage: ImageRef;
  status: OutfitStatus;
  featured: boolean;
  // Absent on documents created before collections existed.
  collectionIds?: Types.ObjectId[];
  items: OutfitItemDoc[];
  createdAt: Date;
  updatedAt: Date;
}

export type OutfitRecord = OutfitDoc & { _id: Types.ObjectId };

const imageSchema = new Schema<ImageRef>(
  {
    key: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { _id: false },
);

const anchorSchema = new Schema<Anchor>({ x: { type: Number, required: true }, y: { type: Number, required: true } }, { _id: false });

const itemSchema = new Schema<OutfitItemDoc>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    subtitle: String,
    description: String,
    image: { type: imageSchema, required: true },
    side: { type: String, enum: ['left', 'right'], required: true },
    order: { type: Number, required: true },
    anchor: anchorSchema,
    affiliateUrl: { type: String, default: '' },
  },
  { _id: false },
);

const outfitSchema = new Schema<OutfitDoc>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    seoDescription: String,
    modelImage: { type: imageSchema, required: true },
    status: { type: String, enum: ['draft', 'published'], required: true, index: true },
    featured: { type: Boolean, default: false },
    collectionIds: { type: [Schema.Types.ObjectId], default: [] },
    items: { type: [itemSchema], default: [] },
  },
  { timestamps: true },
);

// At most one featured outfit; callers must clear the previous one first.
outfitSchema.index({ featured: 1 }, { unique: true, partialFilterExpression: { featured: true } });
outfitSchema.index({ updatedAt: -1 });
// Public list: filter on status, newest first, `_id` as the stable tie-breaker.
outfitSchema.index({ status: 1, updatedAt: -1, _id: -1 });
// Public feed order: featured first, then newest.
outfitSchema.index({ status: 1, featured: -1, updatedAt: -1, _id: -1 });

// Collection page and carousel tabs: published outfits of one collection, newest first.
outfitSchema.index({ collectionIds: 1, status: 1, updatedAt: -1, _id: -1 });

export const OutfitModel = model<OutfitDoc>('Outfit', outfitSchema);
