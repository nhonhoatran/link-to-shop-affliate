import { Schema, model, type Types } from 'mongoose';
import type { ImageRef, MediaKind } from '@under30ss/shared';

export interface ImportMediaDoc {
  sessionId: Types.ObjectId;
  clientMediaId: string;
  sha256: string;
  kind: MediaKind;
  status: 'uploading' | 'ready' | 'failed';
  image?: ImageRef;
  leaseOwner?: string;
  leaseUntil: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportMediaRecord = ImportMediaDoc & { _id: Types.ObjectId };

const image = new Schema<ImageRef>({ key: String, width: Number, height: Number }, { _id: false });
const schema = new Schema<ImportMediaDoc>(
  {
    sessionId: { type: Schema.Types.ObjectId, required: true },
    clientMediaId: { type: String, required: true },
    sha256: { type: String, required: true },
    kind: { type: String, enum: ['model', 'item'], required: true },
    status: { type: String, enum: ['uploading', 'ready', 'failed'], required: true },
    image,
    leaseOwner: String,
    leaseUntil: { type: Date, required: true },
    error: String,
  },
  { timestamps: true },
);

schema.index({ sessionId: 1, clientMediaId: 1 }, { unique: true });
export const ImportMediaModel = model<ImportMediaDoc>('ImportMedia', schema);
