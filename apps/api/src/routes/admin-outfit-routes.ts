import { Router } from 'express';
import {
  adminOutfitListQuerySchema,
  outfitInputSchema,
  outfitUpdateSchema,
  setFeaturedRequestSchema,
  type OutfitInput,
  type SetFeaturedRequest,
  type UpdateOutfitRequest,
} from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { notFound } from '../lib/app-error';
import { validateBody } from '../middleware/validate-body-middleware';
import { createMediaUrlResolver, toAdminOutfitDto } from '../services/outfit-mapper';
import {
  applyFeatured,
  createOutfit,
  deleteOutfit,
  findOutfitById,
  listAdminOutfits,
  updateOutfit,
} from '../services/outfit-service';
import { outfitRevalidation } from '../services/revalidate-web-service';

export const createAdminOutfitRoutes = ({ env, revalidate }: AppContext): Router => {
  const router = Router();
  const resolveUrl = createMediaUrlResolver(env);

  router.get('/', async (req, res) => {
    const query = adminOutfitListQuerySchema.parse(req.query);
    res.json(await listAdminOutfits(query, env));
  });

  router.post('/', validateBody(outfitInputSchema), async (req, res) => {
    const outfit = await createOutfit(req.body as OutfitInput);
    await revalidate(outfitRevalidation(outfit.slug));
    res.status(201).json(toAdminOutfitDto(outfit, resolveUrl));
  });

  router.get('/:id', async (req, res) => {
    const outfit = await findOutfitById(req.params.id);
    if (!outfit) throw notFound('Không tìm thấy outfit');
    res.json(toAdminOutfitDto(outfit, resolveUrl));
  });

  router.put('/:id', validateBody(outfitUpdateSchema), async (req, res) => {
    const result = await updateOutfit(String(req.params.id), req.body as UpdateOutfitRequest);
    if (!result) throw notFound('Không tìm thấy outfit');
    await revalidate(outfitRevalidation(result.outfit.slug, result.previousSlug));
    res.json(toAdminOutfitDto(result.outfit, resolveUrl));
  });

  router.delete('/:id', async (req, res) => {
    const outfit = await deleteOutfit(req.params.id);
    if (!outfit) throw notFound('Không tìm thấy outfit');
    await revalidate(outfitRevalidation(outfit.slug));
    res.status(204).end();
  });

  router.post('/:id/featured', validateBody(setFeaturedRequestSchema), async (req, res) => {
    const { featured } = req.body as SetFeaturedRequest;
    const outfit = await applyFeatured(String(req.params.id), featured);
    if (!outfit) throw notFound('Không tìm thấy outfit');
    await revalidate(outfitRevalidation(outfit.slug));
    res.json(toAdminOutfitDto(outfit, resolveUrl));
  });

  return router;
};
