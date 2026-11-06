import { Router } from 'express';
import { settingsInputSchema, type SettingsInput } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { validateBody } from '../middleware/validate-body-middleware';
import { getAdminSettings, updateSettings } from '../services/settings-service';

export const createAdminSettingsRoutes = ({ env, revalidate }: AppContext): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await getAdminSettings(env));
  });

  router.put('/', validateBody(settingsInputSchema), async (req, res) => {
    const settings = await updateSettings(req.body as SettingsInput, env);
    // Site name and SEO texts appear on every page, so refresh them all.
    await revalidate({ scope: 'all' });
    res.json(settings);
  });

  return router;
};
