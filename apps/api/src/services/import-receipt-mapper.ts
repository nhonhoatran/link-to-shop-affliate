import { buildMediaUrl, type ImportMediaReceipt, type ImportOperationReceipt } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { conflict } from '../lib/app-error';
import type { ImportMediaRecord } from '../models/import-media-model';
import type { ImportOperationRecord } from '../models/import-operation-model';

export const toImportMediaReceipt = (record: ImportMediaRecord, env: Env): ImportMediaReceipt => {
  if (record.status !== 'ready' || !record.image) throw conflict('Ảnh chưa được tải xong; vui lòng thử lại');
  return {
    clientMediaId: record.clientMediaId, sha256: record.sha256, kind: record.kind,
    image: { ...record.image, url: buildMediaUrl(env.MEDIA_PUBLIC_BASE_URL, record.image.key) },
  };
};

export const toImportOperationReceipt = (record: ImportOperationRecord): ImportOperationReceipt => ({
  operationId: record.operationId,
  payloadHash: record.payloadHash,
  status: record.status,
  ...(record.writeStarted && record.status !== 'complete' ? { retryOnly: true } : {}),
  ...(record.collectionCreated ? { collectionId: String(record.collectionId), adminCollectionPath: `/admin/collections/${record.collectionId}` } : {}),
  ...(record.outfitCreated ? { outfitId: String(record.outfitId), adminOutfitPath: `/admin/outfits/${record.outfitId}` } : {}),
  ...(record.error ? { error: record.error } : {}),
});
