import { z } from 'zod';
import { MAX_ITEMS_PER_OUTFIT } from './outfit-schemas';

export const POSTER_ANALYSIS_VERSION = 'poster-analysis.v1' as const;
export const percentPointSchema = z.strictObject({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});
export const percentRectSchema = z.strictObject({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().positive().max(100),
  height: z.number().positive().max(100),
}).superRefine((rect, ctx) => {
  if (rect.x + rect.width > 100) ctx.addIssue({ code: 'custom', path: ['width'], message: 'Crop vượt chiều rộng ảnh' });
  if (rect.y + rect.height > 100) ctx.addIssue({ code: 'custom', path: ['height'], message: 'Crop vượt chiều cao ảnh' });
});

export const clientImportIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/, 'ID không hợp lệ');
const reviewReasonsSchema = z.array(z.string().min(1).max(500)).max(30);
export const posterAnalysisItemSchema = z.strictObject({
  id: clientImportIdSchema,
  name: z.string().min(1).max(80).nullable(),
  subtitle: z.string().max(80).nullable(),
  description: z.string().max(240).nullable(),
  side: z.enum(['left', 'right']),
  order: z.number().int().min(0).max(MAX_ITEMS_PER_OUTFIT - 1),
  crop: percentRectSchema.nullable(),
  sourceAnchor: percentPointSchema.nullable(),
  reviewReasons: reviewReasonsSchema,
});
const posterAnalysisBaseSchema = z.strictObject({
  version: z.literal(POSTER_ANALYSIS_VERSION),
  status: z.enum(['ready', 'needs_review', 'unsupported']),
  title: z.string().min(1).max(120).nullable(),
  description: z.string().max(300).nullable(),
  modelCrop: percentRectSchema.nullable(),
  items: z.array(posterAnalysisItemSchema).max(MAX_ITEMS_PER_OUTFIT),
  reviewReasons: reviewReasonsSchema,
});

export const checkUniquePosterItems = (
  items: { id: string; side: string; order: number }[], ctx: z.RefinementCtx,
): void => {
  const ids = new Set<string>();
  const orders = new Set<string>();
  items.forEach((item, index) => {
    if (ids.has(item.id)) ctx.addIssue({ code: 'custom', path: ['items', index, 'id'], message: 'ID món bị trùng' });
    const key = `${item.side}:${item.order}`;
    if (orders.has(key)) ctx.addIssue({ code: 'custom', path: ['items', index, 'order'], message: 'Thứ tự trong cột bị trùng' });
    ids.add(item.id);
    orders.add(key);
  });
};
export const posterAnalysisSchema = posterAnalysisBaseSchema.superRefine((value, ctx) => checkUniquePosterItems(value.items, ctx));
// Cross-field constraints are checked again after the CLI returns its structured output.
export const POSTER_ANALYSIS_JSON_SCHEMA = z.toJSONSchema(posterAnalysisBaseSchema, { target: 'draft-7' });

export type PercentPoint = z.infer<typeof percentPointSchema>;
export type PercentRect = z.infer<typeof percentRectSchema>;
export type PosterAnalysis = z.infer<typeof posterAnalysisSchema>;

export const sourcePointToModel = (point: PercentPoint, crop: PercentRect): PercentPoint | null => {
  percentPointSchema.parse(point);
  percentRectSchema.parse(crop);
  const x = ((point.x - crop.x) / crop.width) * 100;
  const y = ((point.y - crop.y) / crop.height) * 100;
  return x >= 0 && x <= 100 && y >= 0 && y <= 100 ? { x, y } : null;
};
