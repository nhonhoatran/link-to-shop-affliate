import { Router } from 'express';
import type { AppContext } from '../lib/app-context';
import { getPublicHome } from '../services/home-layout-public-service';

export const createPublicHomeRoutes = ({ env }: AppContext): Router => {
  const router = Router();

  router.get('/home', async (_req, res) => {
    res.json(await getPublicHome(env));
  });

  return router;
};
