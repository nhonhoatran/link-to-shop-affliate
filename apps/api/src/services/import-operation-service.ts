import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { serializeImportPayload, type ImportCommit, type ImportCommitContent, type ImportOperationReceipt } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { badRequest, conflict } from '../lib/app-error';
import { isDuplicateKey } from '../lib/mongo-query-helpers';
import { toErrorResponse } from '../middleware/error-handler-middleware';
import { ImportOperationModel, type ImportOperationRecord } from '../models/import-operation-model';
import type { ImportSessionRecord } from '../models/import-session-model';
import { hashImportSecret } from './import-auth-service';
import { buildImportEntityInputs, createImportEntities } from './import-content-service';
import { toImportOperationReceipt } from './import-receipt-mapper';
import { reconcileImportOperations } from './import-operation-reconcile';
import { releaseImportSlot, reserveImportSlot } from './import-session-service';
import { collectionRevalidation, outfitRevalidation } from './revalidate-web-service';

const receiptFor = async (ctx: AppContext, session: ImportSessionRecord, operationId: string, input: ImportCommit): Promise<ImportOperationRecord> => {
  const { payloadHash, ...payload } = input;
  const filter = { sessionId: session._id, operationId };
  let record = await ImportOperationModel.findOne(filter).lean<ImportOperationRecord>();
  if (!record) {
    const intent = {
      ...filter, payloadHash, payload, collectionId: new Types.ObjectId(), outfitId: new Types.ObjectId(),
      status: 'processing' as const, leaseUntil: new Date(0), collectionCreated: false, outfitCreated: false,
    };
    // Invalid or foreign media must not consume an operation identity or create a partial collection.
    await buildImportEntityInputs(intent, payload);
    await reserveImportSlot(session._id, 'operationCount', ctx.env.IMPORT_SESSION_MAX_OPERATIONS);
    try {
      const created = await ImportOperationModel.create(intent);
      record = created.toObject() as ImportOperationRecord;
    } catch (error) {
      await releaseImportSlot(session._id, 'operationCount');
      if (!isDuplicateKey(error)) throw error;
      record = await ImportOperationModel.findOne(filter).lean<ImportOperationRecord>();
    }
  }
  if (!record) throw conflict('Chưa đọc được biên nhận; kiểm tra phiên rồi thử lại');
  if (record.payloadHash !== payloadHash) throw conflict('Mã thao tác đã được dùng cho dữ liệu khác; không thể ghi đè');
  return record;
};

const latestReceipt = async (id: Types.ObjectId): Promise<ImportOperationReceipt> => {
  const record = await ImportOperationModel.findById(id).lean<ImportOperationRecord>();
  if (!record) throw conflict('Chưa đọc được kết quả nhập; kiểm tra lại phiên');
  const reconciled = (await reconcileImportOperations([record]))[0]!;
  return toImportOperationReceipt(reconciled);
};

export const commitImportOperation = async (ctx: AppContext, session: ImportSessionRecord, operationId: string, input: ImportCommit): Promise<ImportOperationReceipt> => {
  const { payloadHash, ...payload } = input;
  if (hashImportSecret(serializeImportPayload(payload)) !== payloadHash) throw badRequest('Fingerprint dữ liệu không khớp', { payloadHash: 'Kiểm tra lại dữ liệu đã duyệt' });
  const record = await receiptFor(ctx, session, operationId, input);
  if (record.status === 'complete') return toImportOperationReceipt(record);
  const leaseOwner = randomUUID();
  const claimed = await ImportOperationModel.findOneAndUpdate(
    { _id: record._id, status: { $ne: 'complete' }, leaseUntil: { $lte: new Date() } },
    { $set: { status: 'processing', leaseOwner, leaseUntil: new Date(Date.now() + ctx.env.IMPORT_LEASE_MS) }, $unset: { error: 1 } },
    { returnDocument: 'after' },
  ).lean<ImportOperationRecord>();
  if (!claimed) return latestReceipt(record._id);
  try {
    await createImportEntities(ctx, claimed, payload as ImportCommitContent);
    await ctx.revalidate(collectionRevalidation(payload.collection.slug));
    await ctx.revalidate(outfitRevalidation(payload.outfit.slug));
    await ImportOperationModel.updateOne(
      { _id: record._id, leaseOwner },
      { $set: { status: 'complete', collectionCreated: true, outfitCreated: true, leaseUntil: new Date(0) }, $unset: { leaseOwner: 1, error: 1 } },
    );
    return latestReceipt(record._id);
  } catch (error) {
    const message = toErrorResponse(error).body.error.message;
    await ImportOperationModel.updateOne(
      { _id: record._id, leaseOwner },
      { $set: { status: 'failed', error: message, leaseUntil: new Date(0) }, $unset: { leaseOwner: 1 } },
    );
    throw error;
  }
};
