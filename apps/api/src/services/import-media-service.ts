import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { MediaKind } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { badRequest, conflict } from '../lib/app-error';
import { isDuplicateKey } from '../lib/mongo-query-helpers';
import { ImportMediaModel, type ImportMediaRecord } from '../models/import-media-model';
import type { ImportSessionRecord } from '../models/import-session-model';
import { processImage } from './image-processing-service';
import { hashImportSecret } from './import-auth-service';
import { toImportMediaReceipt } from './import-receipt-mapper';
import { releaseImportSlot, reserveImportSlot } from './import-session-service';

interface ImportUpload { clientMediaId: string; sha256: string; kind: MediaKind; buffer: Buffer; mimeType: string }

const validateImageType = async ({ buffer, mimeType }: ImportUpload): Promise<void> => {
  const expected: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heif: 'image/avif' };
  try {
    const meta = await sharp(buffer, { limitInputPixels: 100_000_000, failOn: 'error' }).metadata();
    if (!meta.format || expected[meta.format] !== mimeType || (meta.format === 'heif' && meta.compression !== 'av1')) {
      throw new Error('Invalid image type');
    }
  } catch {
    throw badRequest('Định dạng ảnh không khớp nội dung hoặc tệp bị hỏng', { file: 'Chỉ nhận JPEG, PNG, WebP và AVIF hợp lệ' });
  }
};

const receiptFor = async (session: ImportSessionRecord, input: ImportUpload, ctx: AppContext): Promise<ImportMediaRecord> => {
  const filter = { sessionId: session._id, clientMediaId: input.clientMediaId };
  let record = await ImportMediaModel.findOne(filter).lean<ImportMediaRecord>();
  if (!record) {
    await reserveImportSlot(session._id, 'mediaCount', ctx.env.IMPORT_SESSION_MAX_MEDIA);
    try {
      const created = await ImportMediaModel.create({ ...filter, sha256: input.sha256, kind: input.kind, status: 'uploading', leaseUntil: new Date(0) });
      record = created.toObject() as ImportMediaRecord;
    } catch (error) {
      await releaseImportSlot(session._id, 'mediaCount');
      if (!isDuplicateKey(error)) throw error;
      record = await ImportMediaModel.findOne(filter).lean<ImportMediaRecord>();
    }
  }
  if (!record) throw conflict('Chưa đọc được biên nhận ảnh; vui lòng thử lại');
  if (record.sha256 !== input.sha256 || record.kind !== input.kind) throw conflict('Mã ảnh đã được dùng cho nội dung hoặc loại ảnh khác');
  return record;
};

export const uploadImportMedia = async (ctx: AppContext, session: ImportSessionRecord, input: ImportUpload) => {
  if (hashImportSecret(input.buffer) !== input.sha256) throw badRequest('Checksum ảnh không khớp', { sha256: 'Đọc lại ảnh và thử tải lại' });
  await validateImageType(input);
  const record = await receiptFor(session, input, ctx);
  if (record.status === 'ready') return toImportMediaReceipt(record, ctx.env);
  const leaseOwner = randomUUID();
  const claimed = await ImportMediaModel.findOneAndUpdate(
    { _id: record._id, status: { $ne: 'ready' }, leaseUntil: { $lte: new Date() } },
    { $set: { status: 'uploading', leaseOwner, leaseUntil: new Date(Date.now() + ctx.env.IMPORT_LEASE_MS) }, $unset: { error: 1 } },
    { returnDocument: 'after' },
  ).lean<ImportMediaRecord>();
  if (!claimed) {
    const latest = await ImportMediaModel.findById(record._id).lean<ImportMediaRecord>();
    if (latest?.status === 'ready') return toImportMediaReceipt(latest, ctx.env);
    throw conflict('Ảnh đang được tải ở yêu cầu khác; kiểm tra phiên rồi thử lại');
  }
  try {
    const processed = await processImage(input.buffer, input.kind, ctx.env);
    // Output bytes join the identity so a changed image pipeline never rewrites an immutable cached URL.
    const key = `public/import/${session._id}/${record._id}-${hashImportSecret(processed.buffer)}.webp`;
    await ctx.storage.putObject({ key, body: processed.buffer, contentType: processed.contentType, cacheControl: 'public, max-age=31536000, immutable' });
    const image = { key, width: processed.width, height: processed.height };
    const saved = await ImportMediaModel.findOneAndUpdate(
      { _id: record._id, leaseOwner }, { $set: { status: 'ready', image, leaseUntil: new Date(0) }, $unset: { leaseOwner: 1, error: 1 } },
      { returnDocument: 'after' },
    ).lean<ImportMediaRecord>();
    if (!saved) throw conflict('Quyền xử lý ảnh đã chuyển sang yêu cầu khác; kiểm tra phiên rồi thử lại');
    return toImportMediaReceipt(saved, ctx.env);
  } catch (error) {
    await ImportMediaModel.updateOne(
      { _id: record._id, leaseOwner }, { $set: { status: 'failed', error: 'Tải ảnh chưa hoàn tất; thử lại với cùng mã ảnh', leaseUntil: new Date(0) }, $unset: { leaseOwner: 1 } },
    );
    throw error;
  }
};
