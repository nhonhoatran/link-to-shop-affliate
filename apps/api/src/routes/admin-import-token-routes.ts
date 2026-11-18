import { Router } from 'express';
import { z } from 'zod';
import { MAX_LIST_PAGE, createImportTokenResponseSchema, createImportTokenSchema, importTokenListSchema } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { validateBody } from '../middleware/validate-body-middleware';
import { createImportToken, listImportTokens, revokeImportToken } from '../services/import-auth-service';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(MAX_LIST_PAGE).default(1),
  size: z.coerce.number().int().min(1).optional(),
});

export const createAdminImportTokenRoutes = ({ env }: AppContext): Router => {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/', async (req, res) => {
    const query = listQuery.parse(req.query);
    const size = Math.min(query.size ?? env.ADMIN_PAGE_SIZE_DEFAULT, env.ADMIN_PAGE_SIZE_MAX);
    res.json(importTokenListSchema.parse(await listImportTokens(req.session.adminId!, query.page, size)));
  });
  router.post('/', validateBody(createImportTokenSchema), async (req, res) => {
    const { label, expiresAt } = createImportTokenSchema.parse(req.body);
    res.status(201).json(createImportTokenResponseSchema.parse(await createImportToken(req.session.adminId!, label, expiresAt, env)));
  });
  router.delete('/:id', async (req, res) => {
    await revokeImportToken(req.session.adminId!, String(req.params.id));
    res.status(204).end();
  });
  return router;
};
