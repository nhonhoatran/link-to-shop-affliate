import { z } from 'zod';
import { affiliateUrlSchema, anchorSchema, imageWithUrlSchema, MAX_ITEMS_PER_OUTFIT, outfitSlugSchema } from './outfit-schemas';
import { collectionSlugSchema } from './collection-schemas';
import { clientImportIdSchema, checkUniquePosterItems } from './poster-analysis-schema';
import { objectIdSchema } from './object-id-schema';

export const DESKTOP_IMPORT_VERSION = 'desktop-import.v1' as const;
export const IMPORT_SCOPE = 'import:draft' as const;
export const importHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const IMPORT_API_PATHS = {
  tokens: '/api/admin/import-tokens',
  capabilities: '/api/import/capabilities',
  session: (id: string) => `/api/import/sessions/${encodeURIComponent(id)}`,
  media: (id: string, mediaId: string) => `/api/import/sessions/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}`,
  operation: (id: string, operationId: string) => `/api/import/sessions/${encodeURIComponent(id)}/operations/${encodeURIComponent(operationId)}`,
  token: (id: string) => `/api/admin/import-tokens/${encodeURIComponent(id)}`,
} as const;

export const createImportTokenSchema = z.strictObject({ label: z.string().trim().min(1).max(100), expiresAt: z.iso.datetime() });
export const importTokenDtoSchema = z.strictObject({
  id: objectIdSchema, label: z.string(), prefix: z.string(), scope: z.literal(IMPORT_SCOPE),
  expiresAt: z.string(), revokedAt: z.string().nullable(), createdAt: z.string(),
});
export const createImportTokenResponseSchema = z.strictObject({ token: z.string(), record: importTokenDtoSchema });
export const importTokenListSchema = z.strictObject({
  items: z.array(importTokenDtoSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), size: z.number().int().positive(),
});
export const importCapabilitiesSchema = z.strictObject({
  contractVersion: z.literal(DESKTOP_IMPORT_VERSION), scope: z.literal(IMPORT_SCOPE),
  uploadMaxBytes: z.number().int().positive(), sessionMaxMedia: z.number().int().positive(), sessionMaxOperations: z.number().int().positive(),
});
export const startImportSessionSchema = z.strictObject({
  contractVersion: z.literal(DESKTOP_IMPORT_VERSION), sourceLabel: z.string().min(1).max(200), sourceFingerprint: importHashSchema,
});
export const importMediaReceiptSchema = z.strictObject({
  clientMediaId: clientImportIdSchema, sha256: importHashSchema, kind: z.enum(['model', 'item']), image: imageWithUrlSchema,
});
export const importCommitItemSchema = z.strictObject({
  id: clientImportIdSchema, name: z.string().trim().min(1).max(80), subtitle: z.string().max(80).optional(),
  description: z.string().max(240).optional(), mediaId: clientImportIdSchema, side: z.enum(['left', 'right']),
  order: z.number().int().min(0).max(MAX_ITEMS_PER_OUTFIT - 1), anchor: anchorSchema.optional(), affiliateUrl: affiliateUrlSchema,
});
const importCommitContentBaseSchema = z.strictObject({
  contractVersion: z.literal(DESKTOP_IMPORT_VERSION),
  collection: z.strictObject({ name: z.string().trim().min(1).max(80), slug: collectionSlugSchema, description: z.string().max(500).optional(), coverMediaId: clientImportIdSchema }),
  outfit: z.strictObject({
    slug: outfitSlugSchema, title: z.string().trim().min(1).max(120), seoDescription: z.string().max(300).optional(),
    modelMediaId: clientImportIdSchema, items: z.array(importCommitItemSchema).max(MAX_ITEMS_PER_OUTFIT),
  }),
});
export const importCommitContentSchema = importCommitContentBaseSchema.superRefine((value, ctx) => {
  const nested = { ...ctx, addIssue: (issue: Parameters<z.RefinementCtx['addIssue']>[0]) => {
    if (typeof issue === 'string') ctx.addIssue(issue);
    else ctx.addIssue({ ...issue, path: ['outfit', ...(issue.path ?? [])] });
  } };
  checkUniquePosterItems(value.outfit.items, nested);
});
export const importCommitSchema = importCommitContentSchema.safeExtend({ payloadHash: importHashSchema });
export const importOperationReceiptSchema = z.strictObject({
  operationId: clientImportIdSchema, payloadHash: importHashSchema, status: z.enum(['processing', 'complete', 'failed']),
  collectionId: objectIdSchema.optional(), outfitId: objectIdSchema.optional(), adminCollectionPath: z.string().optional(),
  adminOutfitPath: z.string().optional(), error: z.string().optional(),
  retryOnly: z.boolean().optional(),
});
export const importSessionDtoSchema = startImportSessionSchema.extend({
  clientSessionId: clientImportIdSchema, media: z.array(importMediaReceiptSchema), operations: z.array(importOperationReceiptSchema),
});

// Identical serialization is used on both sides before computing SHA-256.
export const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};
export const serializeImportPayload = (value: unknown): string => canonicalJson(importCommitContentSchema.parse(value));

export type ImportTokenDto = z.infer<typeof importTokenDtoSchema>;
export type CreateImportTokenInput = z.infer<typeof createImportTokenSchema>;
export type ImportCapabilities = z.infer<typeof importCapabilitiesSchema>;
export type ImportMediaReceipt = z.infer<typeof importMediaReceiptSchema>;
export type ImportOperationReceipt = z.infer<typeof importOperationReceiptSchema>;
export type ImportSessionDto = z.infer<typeof importSessionDtoSchema>;
export type ImportCommitContent = z.infer<typeof importCommitContentSchema>;
export type ImportCommit = z.infer<typeof importCommitSchema>;
