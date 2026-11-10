import { z } from 'zod';
import { collectionSlugSchema } from './collection-schemas';
import { HOME_SECTION_TYPES } from './home-sections';
import { newsletterEmailSchema, newsletterStatusSchema } from './newsletter-contract';
import { anchorSchema, outfitItemSchema, outfitSlugSchema, outfitStatusSchema } from './outfit-schemas';
import { settingsInputSchema } from './settings-schemas';

// Demo seed: one file describes settings, collections, outfits, the home layout and newsletter subscribers.
// Images are files on disk; `prompt` and `aspectRatio` are read only by scripts/demo-images (the generator).
export const demoImageSchema = z.object({
  file: z.string().min(1),
  prompt: z.string().optional(),
  aspectRatio: z.enum(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']).optional(),
});

export const demoItemSchema = outfitItemSchema.omit({ image: true, anchor: true }).extend({
  image: demoImageSchema,
  anchor: anchorSchema.optional(),
  // What the anchor detector looks for on the model photo (defaults to `name`).
  detect: z.string().optional(),
});

export const demoOutfitSchema = z.object({
  slug: outfitSlugSchema,
  title: z.string().min(1).max(120),
  seoDescription: z.string().max(300).optional(),
  modelImage: demoImageSchema,
  status: outfitStatusSchema,
  featured: z.boolean(),
  collections: z.array(collectionSlugSchema),
  items: z.array(demoItemSchema),
});

export const demoCollectionSchema = z.object({
  slug: collectionSlugSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  seoDescription: z.string().max(300).optional(),
  status: outfitStatusSchema,
  coverImage: demoImageSchema,
});

export const demoSettingsSchema = settingsInputSchema.omit({ ogImage: true }).extend({ ogImage: demoImageSchema.optional() });

// Section props keep slugs (`collectionSlugs`, `outfitSlugs`, `outfitSlug`) and image files; the seeder swaps them
// for ids and storage keys, then validates the result with homeLayoutContentSchema.
export const demoHomeSectionSchema = z.object({
  type: z.enum(HOME_SECTION_TYPES),
  props: z.record(z.string(), z.unknown()),
});

export const demoSubscriberSchema = z.object({
  email: newsletterEmailSchema,
  status: newsletterStatusSchema,
  daysAgo: z.number().int().min(0),
});

export const demoSeedFileSchema = z.object({
  version: z.literal(1),
  settings: demoSettingsSchema,
  collections: z.array(demoCollectionSchema),
  outfits: z.array(demoOutfitSchema),
  home: z.array(demoHomeSectionSchema),
  subscribers: z.array(demoSubscriberSchema),
});

export type DemoImage = z.infer<typeof demoImageSchema>;
export type DemoItem = z.infer<typeof demoItemSchema>;
export type DemoOutfit = z.infer<typeof demoOutfitSchema>;
export type DemoCollection = z.infer<typeof demoCollectionSchema>;
export type DemoHomeSection = z.infer<typeof demoHomeSectionSchema>;
export type DemoSubscriber = z.infer<typeof demoSubscriberSchema>;
export type DemoSeedFile = z.infer<typeof demoSeedFileSchema>;
