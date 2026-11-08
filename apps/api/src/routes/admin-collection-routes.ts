import { Router } from 'express';
import {
  adminCollectionListQuerySchema,
  collectionInputSchema,
  collectionMoveRequestSchema,
  collectionOutfitsRequestSchema,
  type AdminCollectionDto,
  type CollectionInput,
  type CollectionMoveRequest,
  type CollectionOutfitsRequest,
} from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { notFound } from '../lib/app-error';
import { validateBody } from '../middleware/validate-body-middleware';
import {
  addOutfitsToCollection,
  moveCollection,
  removeOutfitFromCollection,
} from '../services/collection-membership-service';
import {
  createCollection,
  deleteCollection,
  getAdminCollection,
  listAdminCollections,
  updateCollection,
} from '../services/collection-service';
import { collectionRevalidation } from '../services/revalidate-web-service';

const NOT_FOUND_MESSAGE = 'Không tìm thấy bộ sưu tập';

export const createAdminCollectionRoutes = ({ env, revalidate }: AppContext): Router => {
  const router = Router();

  const reload = async (id: string): Promise<AdminCollectionDto> => {
    const collection = await getAdminCollection(id, env);
    if (!collection) throw notFound(NOT_FOUND_MESSAGE);
    return collection;
  };

  router.get('/', async (req, res) => {
    res.json(await listAdminCollections(adminCollectionListQuerySchema.parse(req.query), env));
  });

  router.post('/', validateBody(collectionInputSchema), async (req, res) => {
    const collection = await createCollection(req.body as CollectionInput, env);
    await revalidate(collectionRevalidation(collection.slug));
    res.status(201).json(collection);
  });

  router.get('/:id', async (req, res) => {
    res.json(await reload(String(req.params.id)));
  });

  router.put('/:id', validateBody(collectionInputSchema), async (req, res) => {
    const result = await updateCollection(String(req.params.id), req.body as CollectionInput, env);
    if (!result) throw notFound(NOT_FOUND_MESSAGE);
    await revalidate(collectionRevalidation(result.collection.slug, result.previousSlug));
    res.json(result.collection);
  });

  router.delete('/:id', async (req, res) => {
    const removed = await deleteCollection(String(req.params.id));
    if (!removed) throw notFound(NOT_FOUND_MESSAGE);
    await revalidate(collectionRevalidation(removed.slug));
    res.status(204).end();
  });

  router.post('/:id/move', validateBody(collectionMoveRequestSchema), async (req, res) => {
    await moveCollection(String(req.params.id), (req.body as CollectionMoveRequest).direction);
    const collection = await reload(String(req.params.id));
    await revalidate(collectionRevalidation(collection.slug));
    res.json(collection);
  });

  router.post('/:id/outfits', validateBody(collectionOutfitsRequestSchema), async (req, res) => {
    const { outfitIds } = req.body as CollectionOutfitsRequest;
    if (!(await addOutfitsToCollection(String(req.params.id), outfitIds))) throw notFound(NOT_FOUND_MESSAGE);
    const collection = await reload(String(req.params.id));
    await revalidate(collectionRevalidation(collection.slug));
    res.json(collection);
  });

  router.delete('/:id/outfits/:outfitId', async (req, res) => {
    if (!(await removeOutfitFromCollection(String(req.params.id), String(req.params.outfitId)))) throw notFound(NOT_FOUND_MESSAGE);
    const collection = await reload(String(req.params.id));
    await revalidate(collectionRevalidation(collection.slug));
    res.json(collection);
  });

  return router;
};
