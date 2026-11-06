import { z } from 'zod';
import { outfitItemSchema, outfitStatusSchema, slugSchema } from './outfit-schemas';

// Seed images are files on disk (relative to the seed/ directory); the seeder
// uploads them to S3 and replaces `file` with the storage key.
export const seedImageSchema = z.object({
  file: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const seedItemSchema = outfitItemSchema.extend({ image: seedImageSchema });

// The publish rule is not enforced here: sample outfits may ship without links.
export const seedOutfitSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1).max(120),
  seoDescription: z.string().max(300).optional(),
  modelImage: seedImageSchema,
  status: outfitStatusSchema,
  featured: z.boolean(),
  items: z.array(seedItemSchema),
});

export const seedFileSchema = z.object({
  version: z.literal(1),
  outfits: z.array(seedOutfitSchema),
});

export type SeedImage = z.infer<typeof seedImageSchema>;
export type SeedOutfit = z.infer<typeof seedOutfitSchema>;
export type SeedFile = z.infer<typeof seedFileSchema>;
