import { z } from 'zod';
import { imageRefSchema } from '../outfit-schemas';

// Technical guards against oversized payloads, not business values; the numeric defaults live in home-section-defaults.ts.
export const MAX_HOME_SECTIONS = 40;
export const MAX_SECTION_OUTFITS = 48;
export const MAX_SECTION_COLLECTIONS = 24;
export const MAX_OUTFIT_LIST_TABS = 6;
export const MIN_GRID_COLUMNS = 2;
export const MAX_GRID_COLUMNS = 6;

export const sectionIdSchema = z.string().min(1).max(64);

// The API strips `url` when writing and attaches it when reading.
export const sectionImageSchema = imageRefSchema.extend({ url: z.string().optional() });

export const sectionPropsShape = {
  id: sectionIdSchema,
  visible: z.boolean().default(true),
} as const;

export const gridColumnsSchema = z.number().int().min(MIN_GRID_COLUMNS).max(MAX_GRID_COLUMNS);
export const positiveCountSchema = z.number().int().min(1);
