import { Schema, model, type Types } from 'mongoose';

export interface ImportTokenDoc {
  ownerAdminId: Types.ObjectId;
  label: string;
  tokenHash: string;
  prefix: string;
  scope: 'import:draft';
  activeSlot?: number;
  sessionCount: number;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportTokenRecord = ImportTokenDoc & { _id: Types.ObjectId };

const schema = new Schema<ImportTokenDoc>(
  {
    ownerAdminId: { type: Schema.Types.ObjectId, required: true, index: true },
    label: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    prefix: { type: String, required: true },
    scope: { type: String, enum: ['import:draft'], required: true },
    activeSlot: { type: Number, select: false },
    sessionCount: { type: Number, default: 0, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
  },
  { timestamps: true },
);

schema.index({ ownerAdminId: 1, createdAt: -1, _id: -1 });
schema.index({ ownerAdminId: 1, activeSlot: 1 }, { unique: true, partialFilterExpression: { activeSlot: { $type: 'number' } } });
export const ImportTokenModel = model<ImportTokenDoc>('ImportToken', schema);
