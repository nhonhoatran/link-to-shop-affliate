import { createHash, randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import type { ImportTokenDto } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { badRequest, conflict, notFound, unauthorized } from '../lib/app-error';
import { isObjectId } from '../lib/object-id';
import { isDuplicateKey } from '../lib/mongo-query-helpers';
import { ImportTokenModel, type ImportTokenRecord } from '../models/import-token-model';
import { adminExists } from './admin-user-service';

export interface ImportAuth {
  tokenId: Types.ObjectId;
  ownerAdminId: Types.ObjectId;
}

export const hashImportSecret = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

export const toImportTokenDto = (record: ImportTokenRecord): ImportTokenDto => ({
  id: String(record._id),
  label: record.label,
  prefix: record.prefix,
  scope: record.scope,
  expiresAt: record.expiresAt.toISOString(),
  revokedAt: record.revokedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
});

export const listImportTokens = async (ownerAdminId: string, page: number, size: number) => {
  const filter = { ownerAdminId };
  const [items, total] = await Promise.all([
    ImportTokenModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * size).limit(size).lean<ImportTokenRecord[]>(),
    ImportTokenModel.countDocuments(filter),
  ]);
  return { items: items.map(toImportTokenDto), total, page, size };
};

export const createImportToken = async (ownerAdminId: string, label: string, expiresAt: string, env: Env) => {
  const expiration = new Date(expiresAt);
  const lifetimeMs = expiration.getTime() - Date.now();
  if (!Number.isFinite(lifetimeMs) || lifetimeMs <= 0 || lifetimeMs > env.IMPORT_TOKEN_MAX_AGE_DAYS * 86_400_000) {
    throw badRequest('Hạn token không hợp lệ', { expiresAt: `Chọn hạn trong ${env.IMPORT_TOKEN_MAX_AGE_DAYS} ngày tới` });
  }
  const active = await ImportTokenModel.countDocuments({ ownerAdminId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
  if (active >= env.IMPORT_ACTIVE_TOKENS_PER_ADMIN) throw conflict('Đã đạt giới hạn token; thu hồi token cũ trước khi tạo thêm');
  await ImportTokenModel.updateMany({ ownerAdminId, expiresAt: { $lte: new Date() } }, { $unset: { activeSlot: 1 } });
  const occupied = await ImportTokenModel.find({ ownerAdminId, activeSlot: { $exists: true } }).select('+activeSlot').lean<{ activeSlot: number }[]>();
  const slots = new Set(occupied.map((entry) => entry.activeSlot));
  const token = `u30_import_${randomBytes(32).toString('base64url')}`;
  // The unique slot index makes the active-token limit hold under concurrent creates.
  for (let activeSlot = 0; activeSlot < env.IMPORT_ACTIVE_TOKENS_PER_ADMIN; activeSlot += 1) {
    if (slots.has(activeSlot)) continue;
    try {
      const record = await ImportTokenModel.create({
        ownerAdminId: new Types.ObjectId(ownerAdminId), label, tokenHash: hashImportSecret(token), activeSlot,
        prefix: token.slice(0, 16), scope: 'import:draft', expiresAt: expiration,
      });
      return { token, record: toImportTokenDto(record.toObject() as ImportTokenRecord) };
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }
  throw conflict('Đã đạt giới hạn token; thu hồi token cũ trước khi tạo thêm');
};

export const revokeImportToken = async (ownerAdminId: string, id: string): Promise<void> => {
  if (!isObjectId(id)) throw notFound('Không tìm thấy token');
  const record = await ImportTokenModel.findOneAndUpdate(
    { _id: id, ownerAdminId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() }, $unset: { activeSlot: 1 } },
  );
  if (!record && !(await ImportTokenModel.exists({ _id: id, ownerAdminId }))) throw notFound('Không tìm thấy token');
};

export const authenticateImporter = async (authorization: string | undefined): Promise<ImportAuth> => {
  const match = /^Bearer (u30_import_[A-Za-z0-9_-]{43})$/.exec(authorization ?? '');
  if (!match?.[1]) throw unauthorized('Token nhập nháp không hợp lệ hoặc đã hết hạn');
  const record = await ImportTokenModel.findOne({
    tokenHash: hashImportSecret(match[1]), scope: 'import:draft', revokedAt: { $exists: false }, expiresAt: { $gt: new Date() },
  }).lean<ImportTokenRecord>();
  if (!record || !(await adminExists(String(record.ownerAdminId)))) {
    throw unauthorized('Token nhập nháp không hợp lệ hoặc đã hết hạn');
  }
  return { tokenId: record._id, ownerAdminId: record.ownerAdminId };
};
