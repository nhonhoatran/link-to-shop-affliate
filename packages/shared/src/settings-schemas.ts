import { z } from 'zod';
import { imageRefSchema, imageWithUrlSchema } from './outfit-schemas';

export const settingsInputSchema = z.object({
  siteName: z.string().min(1).max(80),
  seoTitle: z.string().min(1).max(120),
  seoDescription: z.string().max(300),
  ogImage: imageRefSchema.optional(),
  // Falls back to the UPLOAD_MAX_MB env value when absent.
  uploadMaxMb: z.number().int().positive().optional(),
  // Ceilings come from PUBLIC_PAGE_SIZE_MAX and are checked by the API, like uploadMaxMb.
  looksPageSize: z.number().int().positive().optional(),
  relatedOutfitsCount: z.number().int().positive().optional(),
});

export const adminSettingsSchema = settingsInputSchema
  .omit({ ogImage: true })
  .extend({ ogImage: imageWithUrlSchema.optional(), updatedAt: z.string().optional() });

export const publicSettingsSchema = z.object({
  siteName: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  ogImageUrl: z.string().nullable(),
  looksPageSize: z.number().int().positive(),
  relatedOutfitsCount: z.number().int().positive(),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
export type AdminSettingsDto = z.infer<typeof adminSettingsSchema>;
export type PublicSettingsDto = z.infer<typeof publicSettingsSchema>;
