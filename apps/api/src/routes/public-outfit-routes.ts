import { Router } from 'express';
import { publicOutfitFeedQuerySchema, publicOutfitListQuerySchema } from '@under30ss/shared';
import { notFound } from '../lib/app-error';
import type { AppContext } from '../lib/app-context';
import { listPublishedOutfitFeed } from '../services/public-outfit-feed-service';
import {
  getFeaturedOutfit,
  getPublishedOutfitBySlug,
  listPublishedOutfitCards,
  listPublishedSlugs,
} from '../services/public-outfit-service';
import { getPublicSettings } from '../services/settings-service';

export const createPublicRoutes = ({ env }: AppContext): Router => {
  const router = Router();

  router.get('/outfits', async (req, res) => {
    res.json(await listPublishedOutfitCards(publicOutfitListQuerySchema.parse(req.query), env));
  });

  router.get('/outfits/featured', async (_req, res) => {
    const outfit = await getFeaturedOutfit(env);
    if (!outfit) throw notFound('Chưa có outfit nổi bật');
    res.json(outfit);
  });

  router.get('/outfits/slugs', async (_req, res) => {
    res.json(await listPublishedSlugs());
  });

  router.get('/outfits/feed', async (req, res) => {
    const feed = await listPublishedOutfitFeed(publicOutfitFeedQuerySchema.parse(req.query), env);
    if (!feed) throw notFound('Không tìm thấy bộ sưu tập');
    res.json(feed);
  });

  router.get('/outfits/:slug', async (req, res) => {
    const outfit = await getPublishedOutfitBySlug(req.params.slug, env);
    if (!outfit) throw notFound('Không tìm thấy outfit');
    res.json(outfit);
  });

  router.get('/settings', async (_req, res) => {
    res.json(await getPublicSettings(env));
  });

  return router;
};
