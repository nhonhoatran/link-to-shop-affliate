import { createHash } from 'node:crypto';
import { DESKTOP_IMPORT_VERSION, approvedDesktopDraftSchema, importCommitContentSchema, serializeImportPayload,
  sourcePointToModel, type ImportCommit } from '@under30ss/shared';
import type { StoredFile } from './session-store';

export const syncOperationId = (file: StoredFile): string => `${file.id}-r${file.revision}`;
export const createSyncPayload = (file: StoredFile): ImportCommit => {
  if (file.approvedRevision !== file.revision) throw new Error('Bản nháp chưa được duyệt ở phiên bản hiện tại');
  const draft = approvedDesktopDraftSchema.parse(file.draft);
  if (!file.modelAssetId) throw new Error('Thiếu ảnh người mẫu');
  const content = importCommitContentSchema.parse({ contractVersion: DESKTOP_IMPORT_VERSION,
    collection: { ...draft.collection, coverMediaId: file.modelAssetId },
    outfit: { title: draft.title, slug: draft.slug, seoDescription: draft.seoDescription,
      modelMediaId: file.modelAssetId, items: draft.items.map((item) => {
        const mediaId = file.itemAssetIds[item.id];
        if (!mediaId) throw new Error('Thiếu ảnh món đã crop');
        const anchor = item.sourceAnchor ? sourcePointToModel(item.sourceAnchor, draft.modelCrop!) : null;
        return { id: item.id, name: item.name, subtitle: item.subtitle, description: item.description,
          side: item.side, order: item.order, affiliateUrl: item.affiliateUrl, mediaId, ...(anchor ? { anchor } : {}) };
      }) },
  });
  return { ...content, payloadHash: createHash('sha256').update(serializeImportPayload(content)).digest('hex') };
};
