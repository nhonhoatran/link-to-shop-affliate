import { Schema, model, type Types } from 'mongoose';

export interface ImportOperationDoc {
  sessionId: Types.ObjectId;
  operationId: string;
  payloadHash: string;
  payload: unknown;
  collectionId: Types.ObjectId;
  outfitId: Types.ObjectId;
  status: 'processing' | 'complete' | 'failed';
  collectionCreated: boolean;
  outfitCreated: boolean;
  writeStarted: boolean;
  leaseOwner?: string;
  leaseUntil: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportOperationRecord = ImportOperationDoc & { _id: Types.ObjectId };

const schema = new Schema<ImportOperationDoc>(
  {
    sessionId: { type: Schema.Types.ObjectId, required: true },
    operationId: { type: String, required: true },
    payloadHash: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    collectionId: { type: Schema.Types.ObjectId, required: true },
    outfitId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ['processing', 'complete', 'failed'], required: true },
    collectionCreated: { type: Boolean, default: false },
    outfitCreated: { type: Boolean, default: false },
    writeStarted: { type: Boolean, default: false },
    leaseOwner: String,
    leaseUntil: { type: Date, required: true },
    error: String,
  },
  { timestamps: true },
);

schema.index({ sessionId: 1, operationId: 1 }, { unique: true });
export const ImportOperationModel = model<ImportOperationDoc>('ImportOperation', schema);
