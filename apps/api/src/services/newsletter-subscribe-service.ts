import type { NewsletterSubscribeRequest } from '@under30ss/shared';
import { conflict } from '../lib/app-error';
import { isDuplicateKey } from '../lib/mongo-query-helpers';
import { NewsletterSubscriberModel, type NewsletterEventDoc } from '../models/newsletter-subscriber-model';
import { getSavedConsent } from './settings-newsletter-consent-service';

const STALE_CONSENT_MESSAGE = 'Nội dung đồng ý đã được cập nhật, vui lòng tải lại trang và thử lại';

/**
 * Callers get the same outcome for a new, an existing and a honeypot-tripped address, so the response never reveals
 * whether an email is already on the list.
 */
export const subscribeToNewsletter = async (request: NewsletterSubscribeRequest): Promise<void> => {
  if (request.website?.trim()) return;
  const consent = await getSavedConsent();
  if (!consent || consent.version !== request.consentTextVersion) throw conflict(STALE_CONSENT_MESSAGE);

  const at = new Date();
  const event: NewsletterEventDoc = {
    type: 'subscribe',
    at,
    actor: 'self',
    source: request.source,
    textVersion: consent.version,
    consentText: consent.text,
  };
  const current = {
    status: 'subscribed' as const,
    source: request.source,
    consentedAt: at,
    consentText: consent.text,
    consentTextVersion: consent.version,
  };

  // Re-subscribing after an unsubscribe keeps the earlier events; the history is append-only.
  const revived = await NewsletterSubscriberModel.updateOne(
    { email: request.email, status: 'unsubscribed' },
    { $set: current, $unset: { unsubscribedAt: 1 }, $push: { events: event } },
  );
  if (revived.matchedCount > 0) return;

  try {
    await NewsletterSubscriberModel.create({ email: request.email, ...current, events: [event] });
  } catch (error) {
    // Already subscribed, or a concurrent request won the race: the outcome is the same.
    if (!isDuplicateKey(error)) throw error;
  }
};
