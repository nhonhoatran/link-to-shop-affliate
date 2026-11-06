import { Router } from 'express';
import { createAdminInputSchema, type CreateAdminInput } from '@under30ss/shared';
import { unauthorized } from '../lib/app-error';
import { validateBody } from '../middleware/validate-body-middleware';
import { createAdmin, deleteAdmin, listAdmins } from '../services/admin-user-service';

export const createAdminUserRoutes = (): Router => {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json({ items: await listAdmins() });
  });

  router.post('/', validateBody(createAdminInputSchema), async (req, res) => {
    const { email, password } = req.body as CreateAdminInput;
    res.status(201).json(await createAdmin(email, password));
  });

  router.delete('/:id', async (req, res) => {
    const currentAdminId = req.session.adminId;
    if (!currentAdminId) throw unauthorized();
    await deleteAdmin(req.params.id, currentAdminId);
    res.status(204).end();
  });

  return router;
};
