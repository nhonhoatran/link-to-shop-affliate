import { Router } from 'express';
import {
  previewHomeRequestSchema,
  publishHomeRequestSchema,
  restorePreviousHomeRequestSchema,
  saveHomeDraftRequestSchema,
  type PreviewHomeRequest,
  type PublishHomeRequest,
  type RestorePreviousHomeRequest,
  type SaveHomeDraftRequest,
} from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { validateBody } from '../middleware/validate-body-middleware';
import { publishHome, resetHome, restorePreviousHome } from '../services/home-layout-publish-service';
import {
  getAdminHome,
  previewHomeContent,
  previewSavedHomeDraft,
  revertHomeDraft,
  saveHomeDraft,
} from '../services/home-layout-service';
import { HOME_REVALIDATION } from '../services/revalidate-web-service';

export const createAdminHomeRoutes = ({ env, revalidate }: AppContext): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await getAdminHome(env));
  });

  // Saving, reverting and previewing never change what visitors see, so none of them revalidate.
  router.put('/draft', validateBody(saveHomeDraftRequestSchema), async (req, res) => {
    res.json(await saveHomeDraft(req.body as SaveHomeDraftRequest, env));
  });

  router.post('/revert-draft', async (_req, res) => {
    res.json(await revertHomeDraft(env));
  });

  router.get('/preview', async (_req, res) => {
    res.json(await previewSavedHomeDraft(env));
  });

  router.post('/preview', validateBody(previewHomeRequestSchema), async (req, res) => {
    res.json(await previewHomeContent((req.body as PreviewHomeRequest).content, env));
  });

  router.post('/publish', validateBody(publishHomeRequestSchema), async (req, res) => {
    const { result, changed } = await publishHome(req.body as PublishHomeRequest);
    if (changed) await revalidate(HOME_REVALIDATION);
    res.json(result);
  });

  router.post('/restore-previous', validateBody(restorePreviousHomeRequestSchema), async (req, res) => {
    const result = await restorePreviousHome(req.body as RestorePreviousHomeRequest);
    await revalidate(HOME_REVALIDATION);
    res.json(result);
  });

  router.post('/reset', async (_req, res) => {
    const result = await resetHome(env);
    await revalidate(HOME_REVALIDATION);
    res.json(result);
  });

  return router;
};
