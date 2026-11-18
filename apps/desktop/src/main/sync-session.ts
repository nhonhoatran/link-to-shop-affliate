import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { DESKTOP_IMPORT_VERSION, type DesktopProgress, type ImportCapabilities } from '@under30ss/shared';
import type { ImportClient } from './import-client';
import { redactRuntimeError } from './codex-adapter';
import { type SessionStore, findStoredFile, type StoredFile } from './session-store';
import { createSyncPayload, syncOperationId } from './sync-payload';

const uploadFileAssets = async (store: SessionStore, sessionId: string, file: StoredFile, client: ImportClient,
  capabilities: ImportCapabilities, uploaded: Map<string, string>, signal: AbortSignal) => {
  const assets: [string, 'model' | 'item'][] = [[file.modelAssetId!, 'model'], ...Object.values(file.itemAssetIds).map((id): [string, 'item'] => [id, 'item'])];
  for (const [assetId, kind] of assets) {
    signal.throwIfAborted();
    const bytes = await readFile(await store.assetPath(sessionId, assetId));
    if (bytes.length > capabilities.uploadMaxBytes) throw new Error('Ảnh crop vượt dung lượng website cho phép; giảm vùng ảnh hoặc tăng giới hạn upload phía website');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const previous = uploaded.get(assetId);
    if (previous && previous !== hash) throw new Error('Ảnh local khác receipt đã upload; đã chặn gửi dữ liệu không khớp');
    if (!previous) {
      const receipt = await client.upload(sessionId, assetId, kind, hash, bytes);
      if (receipt.sha256 !== hash || receipt.clientMediaId !== assetId || receipt.kind !== kind) throw new Error('Receipt upload không khớp ảnh');
      uploaded.set(assetId, hash);
    }
  }
};

export const syncApprovedSession = async (store: SessionStore, sessionId: string, client: ImportClient,
  signal: AbortSignal, emit: (progress: DesktopProgress) => void) => {
  let record = await store.get(sessionId);
  if (!record.credentialFingerprint && (record.session.destinationOrigin || record.files.some((file) => file.remote))) {
    throw new Error('Checkpoint cũ thiếu danh tính token đã gửi. Kiểm tra kết quả trên web trước khi tạo phiên nhập mới.');
  }
  if (record.session.destinationOrigin && record.session.destinationOrigin !== client.origin) throw new Error('Phiên đã gắn với website khác; hãy chuyển kết nối về đúng website');
  if (record.credentialFingerprint && record.credentialFingerprint !== client.credentialFingerprint) {
    throw new Error('Phiên đã bắt đầu gửi bằng token khác. Dùng lại token cũ để đối soát; nếu đã thu hồi, kiểm tra kết quả trên web trước khi tạo phiên mới.');
  }
  const eligible = record.files.filter((file) => file.approvedRevision === file.revision && file.draft && file.status !== 'synced');
  if (!eligible.length) throw new Error('Không có bản nháp đã duyệt để đồng bộ');
  const capabilities = await client.capabilities();
  await store.change(sessionId, (current) => {
    current.session.destinationOrigin = client.origin;
    current.credentialFingerprint = client.credentialFingerprint;
  });
  let remote = await client.start(sessionId, { contractVersion: DESKTOP_IMPORT_VERSION,
    sourceLabel: record.session.name, sourceFingerprint: record.session.sourceFingerprint });
  const operationIds = new Set(remote.operations.map((operation) => operation.operationId));
  const mediaIds = new Set(remote.media.map((media) => media.clientMediaId));
  for (const file of eligible) {
    operationIds.add(syncOperationId(file));
    if (file.modelAssetId) mediaIds.add(file.modelAssetId);
    for (const id of Object.values(file.itemAssetIds)) mediaIds.add(id);
  }
  if (operationIds.size > capabilities.sessionMaxOperations || mediaIds.size > capabilities.sessionMaxMedia) {
    throw new Error(`Phiên vượt hạn mức website (${capabilities.sessionMaxOperations} mục, ${capabilities.sessionMaxMedia} ảnh crop). Tăng cấu hình IMPORT_SESSION_MAX_* trên website hoặc chia folder thành các phiên nhỏ; chưa gửi thêm ảnh hay mục.`);
  }
  const uploaded = new Map(remote.media.map((media) => [media.clientMediaId, media.sha256]));
  for (const selected of eligible) {
    if (signal.aborted) break;
    const fileId = selected.id;
    try {
      await store.change(sessionId, (current) => {
        const file = findStoredFile(current, fileId);
        if (file.approvedRevision !== file.revision) throw new Error('Bản nháp đã thay đổi sau khi duyệt');
        file.status = 'syncing'; file.error = null;
      });
      emit({ sessionId, fileId, kind: 'file', message: 'Đang gửi bản nháp đã duyệt' });
      record = await store.get(sessionId);
      const file = findStoredFile(record, fileId);
      const payload = createSyncPayload(file);
      const operationId = syncOperationId(file);
      let receipt = remote.operations.find((operation) => operation.operationId === operationId);
      if (receipt && receipt.payloadHash !== payload.payloadHash) throw new Error('Dữ liệu khác phiên bản đã gửi; không thể ghi đè operation');
      if (receipt?.status !== 'complete') {
        await uploadFileAssets(store, sessionId, file, client, capabilities, uploaded, signal);
        await store.change(sessionId, (current) => {
          findStoredFile(current, fileId).remote = { operationId, payloadHash: payload.payloadHash, status: 'processing' };
        });
        try { receipt = await client.commit(sessionId, operationId, payload); }
        catch (original) {
          if (signal.aborted) throw original;
          remote = await client.session(sessionId);
          receipt = remote.operations.find((operation) => operation.operationId === operationId);
          if (receipt && receipt.payloadHash === payload.payloadHash) {
            await store.change(sessionId, (current) => { findStoredFile(current, fileId).remote = receipt!; });
          }
          if (receipt?.status !== 'complete') throw original;
        }
      }
      if (!receipt || receipt.payloadHash !== payload.payloadHash) throw new Error('Receipt đồng bộ không khớp bản nháp');
      await store.change(sessionId, (current) => {
        const target = findStoredFile(current, fileId);
        target.remote = receipt!;
        target.status = receipt!.status === 'complete' ? 'synced' : 'error';
        target.error = receipt!.status === 'complete' ? null : (receipt!.error || 'Website đang xử lý; bấm đồng bộ lại để đối soát cùng mã');
      });
    } catch (error) {
      await store.change(sessionId, (current) => {
        const file = findStoredFile(current, fileId);
        file.status = signal.aborted ? 'interrupted' : 'error';
        file.error = signal.aborted ? 'Đồng bộ bị hủy; thử lại để đối soát cùng mã' : redactRuntimeError(error instanceof Error ? error.message : 'Không đồng bộ được');
      });
    }
    emit({ sessionId, fileId, kind: 'file' });
  }
};
