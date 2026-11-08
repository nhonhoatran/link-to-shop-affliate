import { z } from 'zod';
import { imageRefSchema, outfitStatusSchema, slugSchema } from './outfit-schemas';

// `/api/public/collections/slugs` and `/collections/slugs` would collide with a collection of that slug.
export const RESERVED_COLLECTION_SLUGS: readonly string[] = ['slugs'];

export const collectionSlugSchema = slugSchema.refine(
  (slug) => !RESERVED_COLLECTION_SLUGS.includes(slug),
  'This slug is reserved',
);

// `order` is managed by the server (move up / down), never sent by clients.
export const collectionInputSchema = z
  .object({
    slug: collectionSlugSchema,
    name: z.string().min(1).max(80),
    description: z.string().max(500).optional(),
    coverImage: imageRefSchema.optional(),
    status: outfitStatusSchema,
    seoDescription: z.string().max(300).optional(),
  })
  .superRefine((collection, ctx) => {
    if (collection.status === 'published' && !collection.coverImage) {
      ctx.addIssue({
        code: 'custom',
        path: ['coverImage'],
        message: 'A published collection needs a cover image',
      });
    }
  });

export type CollectionInput = z.infer<typeof collectionInputSchema>;
