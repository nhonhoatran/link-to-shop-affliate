import { newsletterConsentSchema, type NewsletterConsentInput } from '../settings-schemas';
import type { AdminNewsletterSubscriberDto, NewsletterConsentDto } from '../newsletter-contract';

export const sampleNewsletterConsentInput: NewsletterConsentInput = newsletterConsentSchema.parse({
  text: 'Tôi đồng ý nhận email giới thiệu outfit mới và ưu đãi.',
  privacyHref: '/privacy',
  privacyLabel: 'Chính sách bảo mật',
});

export const sampleNewsletterConsent: NewsletterConsentDto = {
  text: sampleNewsletterConsentInput.text,
  version: 1,
  privacyHref: sampleNewsletterConsentInput.privacyHref,
  privacyLabel: sampleNewsletterConsentInput.privacyLabel ?? 'Chính sách bảo mật',
};

export const sampleNewsletterSubscribers: AdminNewsletterSubscriberDto[] = [
  {
    id: '64b7f0c2a1b2c3d4e5f60901',
    email: 'khach.a@example.test',
    status: 'subscribed',
    createdAt: '2026-11-01T02:00:00.000Z',
    updatedAt: '2026-11-01T02:00:00.000Z',
    events: [{ type: 'subscribe', at: '2026-11-01T02:00:00.000Z', actor: 'self', source: 'home', textVersion: 1 }],
  },
  {
    id: '64b7f0c2a1b2c3d4e5f60902',
    email: 'khach.b@example.test',
    status: 'unsubscribed',
    createdAt: '2026-10-20T02:00:00.000Z',
    updatedAt: '2026-11-03T08:30:00.000Z',
    events: [
      { type: 'subscribe', at: '2026-10-20T02:00:00.000Z', actor: 'self', source: 'home', textVersion: 1 },
      { type: 'unsubscribe', at: '2026-11-03T08:30:00.000Z', actor: 'admin' },
    ],
  },
];
