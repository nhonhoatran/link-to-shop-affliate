import { z } from 'zod';
import { affiliateUrlSchema, MAX_ITEMS_PER_OUTFIT, outfitSlugSchema } from './outfit-schemas';
import { collectionSlugSchema } from './collection-schemas';
import { clientImportIdSchema, checkUniquePosterItems, percentPointSchema, percentRectSchema, posterAnalysisSchema, sourcePointToModel } from './poster-analysis-schema';
import { desktopSettingsSchema, websiteOriginSchema } from './desktop-settings-schema';
import { importHashSchema, importOperationReceiptSchema } from './desktop-import-contract';

export const desktopDraftItemSchema = z.strictObject({
  id: clientImportIdSchema, name: z.string().max(80), subtitle: z.string().max(80), description: z.string().max(240),
  side: z.enum(['left', 'right']), order: z.number().int().min(0).max(MAX_ITEMS_PER_OUTFIT - 1),
  crop: percentRectSchema.nullable(), sourceAnchor: percentPointSchema.nullable(), affiliateUrl: affiliateUrlSchema,
  reviewReasons: z.array(z.string().max(500)).max(30),
});
export const desktopDraftSchema = z.strictObject({
  title: z.string().max(120), slug: z.string().max(80), seoDescription: z.string().max(300),
  collection: z.strictObject({ name: z.string().max(80), slug: z.string().max(80), description: z.string().max(500) }),
  modelCrop: percentRectSchema.nullable(), items: z.array(desktopDraftItemSchema).max(MAX_ITEMS_PER_OUTFIT),
  reviewReasons: z.array(z.string().max(500)).max(30),
}).superRefine((value, ctx) => checkUniquePosterItems(value.items, ctx));

export const approvedDesktopDraftSchema = desktopDraftSchema.superRefine((draft, ctx) => {
  for (const [path, result] of [
    [['slug'], outfitSlugSchema.safeParse(draft.slug)],
    [['collection', 'slug'], collectionSlugSchema.safeParse(draft.collection.slug)],
  ] as const) {
    if (!result.success) ctx.addIssue({ code: 'custom', path: [...path], message: 'Slug chưa hợp lệ' });
  }
  if (!draft.title.trim()) ctx.addIssue({ code: 'custom', path: ['title'], message: 'Cần tiêu đề' });
  if (!draft.collection.name.trim()) ctx.addIssue({ code: 'custom', path: ['collection', 'name'], message: 'Cần tên bộ sưu tập' });
  if (!draft.modelCrop) ctx.addIssue({ code: 'custom', path: ['modelCrop'], message: 'Cần vùng ảnh người mẫu' });
  draft.items.forEach((item, index) => {
    if (!item.name.trim()) ctx.addIssue({ code: 'custom', path: ['items', index, 'name'], message: 'Cần tên món' });
    if (!item.crop) ctx.addIssue({ code: 'custom', path: ['items', index, 'crop'], message: 'Cần vùng ảnh món' });
    if (item.sourceAnchor && draft.modelCrop && !sourcePointToModel(item.sourceAnchor, draft.modelCrop)) {
      ctx.addIssue({ code: 'custom', path: ['items', index, 'sourceAnchor'], message: 'Điểm nối nằm ngoài vùng người mẫu' });
    }
  });
});
export const desktopFileStatusSchema = z.enum(['pending', 'analyzing', 'ready', 'approved', 'syncing', 'synced', 'error', 'interrupted', 'unsupported']);
export const desktopFileSchema = z.strictObject({
  id: clientImportIdSchema, name: z.string(), sha256: importHashSchema, sourceAssetId: clientImportIdSchema,
  width: z.number().int().positive(), height: z.number().int().positive(), status: desktopFileStatusSchema,
  revision: z.number().int().nonnegative(), approvedRevision: z.number().int().nonnegative().nullable(),
  analysis: posterAnalysisSchema.nullable(), draft: desktopDraftSchema.nullable(),
  modelAssetId: clientImportIdSchema.nullable(), itemAssetIds: z.record(z.string(), clientImportIdSchema),
  error: z.string().nullable(), remote: importOperationReceiptSchema.nullable(),
});
export const desktopSessionSummarySchema = z.strictObject({
  id: clientImportIdSchema, name: z.string(), folderLabel: z.string(), createdAt: z.string(), updatedAt: z.string(),
  destinationOrigin: websiteOriginSchema.nullable(),
  counts: z.strictObject({ total: z.number().int(), analyzed: z.number().int(), approved: z.number().int(), synced: z.number().int(), failed: z.number().int() }),
});
export const desktopSessionSchema = desktopSessionSummarySchema.extend({
  config: desktopSettingsSchema, sourceFingerprint: importHashSchema, warnings: z.array(z.string()),
});
export const desktopProgressSchema = z.strictObject({
  sessionId: clientImportIdSchema, fileId: clientImportIdSchema.optional(), kind: z.enum(['session', 'file']), message: z.string().optional(),
});

export type DesktopDraft = z.infer<typeof desktopDraftSchema>;
export type DesktopDraftItem = z.infer<typeof desktopDraftItemSchema>;
export type DesktopFile = z.infer<typeof desktopFileSchema>;
export type DesktopFileStatus = z.infer<typeof desktopFileStatusSchema>;
export type DesktopSession = z.infer<typeof desktopSessionSchema>;
export type DesktopSessionSummary = z.infer<typeof desktopSessionSummarySchema>;
export type DesktopProgress = z.infer<typeof desktopProgressSchema>;
