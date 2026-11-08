import { Router } from 'express';
import { adminNewsletterListQuerySchema } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { notFound } from '../lib/app-error';
import {
  buildNewsletterFilter,
  deleteNewsletterSubscriber,
  listNewsletterSubscribers,
  unsubscribeByAdmin,
} from '../services/newsletter-admin-service';
import { streamNewsletterCsv } from '../services/newsletter-csv-export';

const NOT_FOUND_MESSAGE = 'Không tìm thấy người đăng ký';

export const createAdminNewsletterRoutes = ({ env }: AppContext): Router => {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await listNewsletterSubscribers(adminNewsletterListQuerySchema.parse(req.query), env));
  });

  // Declared before `/:id` so "export" is never read as an id.
  router.get('/export', async (req, res) => {
    const { q, status } = adminNewsletterListQuerySchema.parse(req.query);
    try {
      await streamNewsletterCsv(res, buildNewsletterFilter({ q, status }));
    } catch (error) {
      if (!res.headersSent) throw error;
      console.error('[api] newsletter export aborted mid-stream', error);
      res.destroy();
    }
  });

  router.patch('/:id/unsubscribe', async (req, res) => {
    const subscriber = await unsubscribeByAdmin(String(req.params.id));
    if (!subscriber) throw notFound(NOT_FOUND_MESSAGE);
    res.json(subscriber);
  });

  router.delete('/:id', async (req, res) => {
    if (!(await deleteNewsletterSubscriber(String(req.params.id)))) throw notFound(NOT_FOUND_MESSAGE);
    res.status(204).end();
  });

  return router;
};
