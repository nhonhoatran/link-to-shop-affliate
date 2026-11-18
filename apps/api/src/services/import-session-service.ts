import type { Types } from 'mongoose';
import type { Env } from '../config/env-config';
import { conflict, notFound } from '../lib/app-error';
import { isDuplicateKey } from '../lib/mongo-query-helpers';
import { ImportMediaModel, type ImportMediaRecord } from '../models/import-media-model';
import { ImportOperationModel, type ImportOperationRecord } from '../models/import-operation-model';
import { ImportSessionModel, type ImportSessionRecord } from '../models/import-session-model';
import { ImportTokenModel } from '../models/import-token-model';
import type { ImportAuth } from './import-auth-service';
import { toImportMediaReceipt, toImportOperationReceipt } from './import-receipt-mapper';
import { reconcileImportOperations } from './import-operation-reconcile';

interface SessionInput { contractVersion: string; sourceLabel: string; sourceFingerprint: string }

const sessionFilter = (auth: ImportAuth, clientSessionId: string) => ({ ...auth, clientSessionId });

export const getImportSession = async (auth: ImportAuth, clientSessionId: string): Promise<ImportSessionRecord> => {
  const record = await ImportSessionModel.findOne(sessionFilter(auth, clientSessionId)).lean<ImportSessionRecord>();
  if (!record) throw notFound('Không tìm thấy phiên nhập của token này');
  return record;
};

export const startImportSession = async (auth: ImportAuth, clientSessionId: string, input: SessionInput, env: Env) => {
  let record = await ImportSessionModel.findOne(sessionFilter(auth, clientSessionId)).lean<ImportSessionRecord>();
  if (!record) {
    const reserved = await ImportTokenModel.updateOne(
      { _id: auth.tokenId, sessionCount: { $lt: env.IMPORT_SESSIONS_PER_TOKEN } }, { $inc: { sessionCount: 1 } },
    );
    if (reserved.modifiedCount !== 1) {
      throw conflict('Đã đạt giới hạn phiên nhập cho token này');
    }
    try {
      const created = await ImportSessionModel.create({ ...sessionFilter(auth, clientSessionId), ...input });
      record = created.toObject() as ImportSessionRecord;
    } catch (error) {
      await ImportTokenModel.updateOne({ _id: auth.tokenId }, { $inc: { sessionCount: -1 } });
      if (!isDuplicateKey(error)) throw error;
      record = await getImportSession(auth, clientSessionId);
    }
  }
  if (record.sourceFingerprint !== input.sourceFingerprint || record.sourceLabel !== input.sourceLabel || record.contractVersion !== input.contractVersion) {
    throw conflict('Mã phiên đã được dùng cho nguồn hoặc cấu hình khác');
  }
  return record;
};

export const readImportSession = async (auth: ImportAuth, clientSessionId: string, env: Env) => {
  const session = await getImportSession(auth, clientSessionId);
  const [media, operations] = await Promise.all([
    ImportMediaModel.find({ sessionId: session._id, status: 'ready' }).sort({ _id: 1 }).lean<ImportMediaRecord[]>(),
    ImportOperationModel.find({ sessionId: session._id }).sort({ _id: 1 }).lean<ImportOperationRecord[]>(),
  ]);
  return {
    clientSessionId, contractVersion: session.contractVersion,
    sourceLabel: session.sourceLabel, sourceFingerprint: session.sourceFingerprint,
    media: media.map((record) => toImportMediaReceipt(record, env)),
    operations: (await reconcileImportOperations(operations)).map(toImportOperationReceipt),
  };
};

export type ImportSlot = 'mediaCount' | 'operationCount';

export const reserveImportSlot = async (sessionId: Types.ObjectId, slot: ImportSlot, limit: number): Promise<void> => {
  const result = await ImportSessionModel.updateOne({ _id: sessionId, [slot]: { $lt: limit } }, { $inc: { [slot]: 1 } });
  if (result.modifiedCount !== 1) throw conflict('Phiên đã đạt giới hạn; tạo phiên mới hoặc điều chỉnh cấu hình máy chủ');
};

export const releaseImportSlot = async (sessionId: Types.ObjectId, slot: ImportSlot): Promise<void> => {
  await ImportSessionModel.updateOne({ _id: sessionId }, { $inc: { [slot]: -1 } });
};
