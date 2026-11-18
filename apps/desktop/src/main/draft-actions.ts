import path from 'node:path';
import { approvedDesktopDraftSchema, desktopDraftSchema, slugifyVietnamese, type DesktopDraft, type PosterAnalysis } from '@under30ss/shared';
import { createDraftAssets } from './image-assets';
import { type SessionStore, fileView, findStoredFile, type StoredSession } from './session-store';

export const draftFromAnalysis = (analysis: PosterAnalysis, filename: string): DesktopDraft => {
  const title = (analysis.title || path.parse(filename).name).slice(0, 120);
  let slug = slugifyVietnamese(title).slice(0, 65).replace(/-+$/, '') || 'look';
  if (['featured', 'slugs', 'feed'].includes(slug)) slug = `look-${slug}`;
  return desktopDraftSchema.parse({ title, slug, seoDescription: analysis.description || '',
    collection: { name: title.slice(0, 80), slug, description: analysis.description || '' },
    modelCrop: analysis.modelCrop, reviewReasons: analysis.reviewReasons,
    items: analysis.items.map((item) => ({ ...item, name: item.name || '', subtitle: item.subtitle || '',
      description: item.description || '', affiliateUrl: '' })),
  });
};
const ensureEditable = (record: StoredSession, fileId: string, revision: number) => {
  const file = findStoredFile(record, fileId);
  if (file.revision !== revision) throw new Error('Bản nháp đã thay đổi; tải lại trước khi lưu');
  const frozen = file.remote && (file.remote.status !== 'failed' || file.remote.retryOnly || file.remote.collectionId || file.remote.outfitId);
  if (frozen || ['analyzing', 'syncing', 'synced'].includes(file.status)) {
    throw new Error('Phiên bản này đang xử lý hoặc đã gửi; đồng bộ lại để đối soát cùng mã, rồi sửa trên website');
  }
  return file;
};
export const saveDesktopDraft = async (store: SessionStore, sessionId: string, fileId: string, expectedRevision: number, input: DesktopDraft) => {
  const draft = desktopDraftSchema.parse(input);
  await store.change(sessionId, async (record) => {
    const file = ensureEditable(record, fileId, expectedRevision);
    const source = await store.assetPath(sessionId, file.sourceAssetId);
    const assets = await createDraftAssets(path.join(store.directory(sessionId), 'files', file.id), source, file.width, file.height, draft);
    file.revision++;
    file.draft = draft;
    file.approvedRevision = null;
    file.status = 'ready'; file.error = null; file.remote = null;
    file.modelAssetId = assets.modelAssetId; file.itemAssetIds = assets.itemAssetIds;
    for (const [id, filename] of Object.entries(assets.assets)) file.assets[id] = path.join('files', file.id, filename);
  });
  return fileView(findStoredFile(await store.get(sessionId), fileId));
};
export const approveDesktopDraft = async (store: SessionStore, sessionId: string, fileId: string, expectedRevision: number) => {
  await store.change(sessionId, (record) => {
    const file = ensureEditable(record, fileId, expectedRevision);
    approvedDesktopDraftSchema.parse(file.draft);
    if (!file.modelAssetId || file.draft!.items.some((item) => !file.itemAssetIds[item.id])) throw new Error('Ảnh crop chưa sẵn sàng; lưu lại bản nháp trước khi duyệt');
    file.approvedRevision = file.revision; file.status = 'approved'; file.error = null;
  });
  return fileView(findStoredFile(await store.get(sessionId), fileId));
};
