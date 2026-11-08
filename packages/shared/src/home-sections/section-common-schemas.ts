import { z } from 'zod';
import { imageRefSchema } from '../outfit-schemas';

// Technical guards against oversized payloads, not business values; the numeric defaults live in home-section-defaults.ts.
export const MAX_HOME_SECTIONS = 40;
export const MAX_SECTION_OUTFITS = 48;
export const MAX_SECTION_COLLECTIONS = 24;
export const MAX_OUTFIT_LIST_TABS = 6;
export const MIN_GRID_COLUMNS = 2;
export const MAX_GRID_COLUMNS = 6;
export const MAX_MARQUEE_ITEMS = 12;
export const MIN_MARQUEE_SECONDS = 10;
export const MAX_MARQUEE_SECONDS = 120;
export const MAX_GALLERY_ITEMS = 12;

export const MAX_SECTION_ID_LENGTH = 64;
export const sectionIdSchema = z.string().min(1).max(MAX_SECTION_ID_LENGTH);

// The API strips `url` when writing and attaches it when reading.
export const sectionImageSchema = imageRefSchema.extend({ url: z.string().optional() });

export const sectionPropsShape = {
  id: sectionIdSchema,
  visible: z.boolean().default(true),
} as const;

export const gridColumnsSchema = z.number().int().min(MIN_GRID_COLUMNS).max(MAX_GRID_COLUMNS);
export const positiveCountSchema = z.number().int().min(1);

// Small label above a section title; optional so layouts saved before it existed stay valid.
export const eyebrowSchema = z.string().max(40).optional();
