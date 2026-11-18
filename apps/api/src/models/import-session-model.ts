import { Schema, model, type Types } from 'mongoose';

export interface ImportSessionDoc {
  tokenId: Types.ObjectId;
  ownerAdminId: Types.ObjectId;
  clientSessionId: string;
  contractVersion: string;
  sourceLabel: string;
  sourceFingerprint: string;
  mediaCount: number;
  operationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportSessionRecord = ImportSessionDoc & { _id: Types.ObjectId };

const schema = new Schema<ImportSessionDoc>(
  {
    tokenId: { type: Schema.Types.ObjectId, required: true },
    ownerAdminId: { type: Schema.Types.ObjectId, required: true },
    clientSessionId: { type: String, required: true },
    contractVersion: { type: String, required: true },
    sourceLabel: { type: String, required: true },
    sourceFingerprint: { type: String, required: true },
    mediaCount: { type: Number, default: 0 },
    operationCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

schema.index({ tokenId: 1, clientSessionId: 1 }, { unique: true });
// Receipts intentionally have no TTL: expiring them would allow a retry to create duplicates.
export const ImportSessionModel = model<ImportSessionDoc>('ImportSession', schema);
