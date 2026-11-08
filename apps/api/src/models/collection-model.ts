import { Schema, model, type Types } from 'mongoose';
import type { ImageRef, OutfitStatus } from '@under30ss/shared';

export interface CollectionDoc {
  slug: string;
  name: string;
  description?: string;
  coverImage?: ImageRef;
  status: OutfitStatus;
  order: number;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CollectionRecord = CollectionDoc & { _id: Types.ObjectId };

const collectionSchema = new Schema<CollectionDoc>(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    coverImage: new Schema<ImageRef>({ key: String, width: Number, height: Number }, { _id: false }),
    status: { type: String, enum: ['draft', 'published'], required: true },
    order: { type: Number, required: true },
    seoDescription: String,
  },
  { timestamps: true },
);

// Public list and `auto` tiles: published only, in display order.
collectionSchema.index({ status: 1, order: 1, _id: 1 });

export const CollectionModel = model<CollectionDoc>('Collection', collectionSchema);

/** A published collection without a cover image (legacy data) cannot be drawn as a card, so it stays hidden. */
export const PUBLISHED_COLLECTION_FILTER = { status: 'published', 'coverImage.key': { $exists: true } } as const;
