import { Router } from 'express';
import type { AppContext } from '../lib/app-context';
import { getAdminStats } from '../services/admin-stats-service';

export const createAdminStatsRoutes = ({ env }: AppContext): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await getAdminStats(env));
  });

  return router;
};
