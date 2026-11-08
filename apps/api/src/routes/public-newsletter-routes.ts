import { Router } from 'express';
import { newsletterSubscribeRequestSchema, type NewsletterSubscribeRequest } from '@under30ss/shared';
import { getNewsletterRateLimit } from '../lib/runtime-defaults';
import { createNewsletterRateLimit } from '../middleware/newsletter-rate-limit-middleware';
import { validateBody } from '../middleware/validate-body-middleware';
import { subscribeToNewsletter } from '../services/newsletter-subscribe-service';

export const createPublicNewsletterRoutes = (): Router => {
  const router = Router();
  const rateLimit = createNewsletterRateLimit(getNewsletterRateLimit());

  router.post('/newsletter', rateLimit, validateBody(newsletterSubscribeRequestSchema), async (req, res) => {
    await subscribeToNewsletter(req.body as NewsletterSubscribeRequest);
    res.status(202).json({ ok: true });
  });

  return router;
};
