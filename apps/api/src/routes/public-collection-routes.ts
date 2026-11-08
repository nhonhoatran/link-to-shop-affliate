import { Router } from 'express';
import { publicCollectionListQuerySchema, publicOutfitListQuerySchema } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { notFound } from '../lib/app-error';
import {
  getPublishedCollectionPage,
  listPublishedCollections,
  listPublishedCollectionSlugs,
} from '../services/public-collection-service';

export const createPublicCollectionRoutes = ({ env }: AppContext): Router => {
  const router = Router();

  router.get('/collections', async (req, res) => {
    res.json(await listPublishedCollections(publicCollectionListQuerySchema.parse(req.query), env));
  });

  // Declared before `/:slug`; the slug schema reserves "slugs" so the two never collide.
  router.get('/collections/slugs', async (_req, res) => {
    res.json(await listPublishedCollectionSlugs());
  });

  router.get('/collections/:slug', async (req, res) => {
    const page = await getPublishedCollectionPage(String(req.params.slug), publicOutfitListQuerySchema.parse(req.query), env);
    if (!page) throw notFound('Không tìm thấy bộ sưu tập');
    res.json(page);
  });

  return router;
};
