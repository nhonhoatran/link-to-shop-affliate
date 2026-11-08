import { describe, expect, it } from 'vitest';
import {
  adminNewsletterListQuerySchema,
  newsletterFormSchema,
  newsletterSubscribeRequestSchema,
  NEWSLETTER_RESULTS,
} from './newsletter-contract';

const request = { email: 'a@example.com', consent: true, consentTextVersion: 1, source: 'home' };

describe('newsletterSubscribeRequestSchema', () => {
  it('trims and lowercases the email', () => {
    const parsed = newsletterSubscribeRequestSchema.parse({ ...request, email: '  Khach@Example.COM ' });
    expect(parsed.email).toBe('khach@example.com');
  });

  it('requires consent to be literally true', () => {
    for (const consent of [false, 'true', undefined]) {
      expect(newsletterSubscribeRequestSchema.safeParse({ ...request, consent }).success).toBe(false);
    }
  });

  it.each(['', 'not-an-email', `${'a'.repeat(250)}@example.com`])('rejects email %s', (email) => {
    expect(newsletterSubscribeRequestSchema.safeParse({ ...request, email }).success).toBe(false);
  });

  it('keeps the honeypot optional and bounded', () => {
    expect(newsletterSubscribeRequestSchema.safeParse(request).success).toBe(true);
    expect(newsletterSubscribeRequestSchema.safeParse({ ...request, website: 'x'.repeat(201) }).success).toBe(false);
  });

  it('rejects an unknown source and a version below 1', () => {
    expect(newsletterSubscribeRequestSchema.safeParse({ ...request, source: 'popup' }).success).toBe(false);
    expect(newsletterSubscribeRequestSchema.safeParse({ ...request, consentTextVersion: 0 }).success).toBe(false);
  });
});

describe('newsletterFormSchema', () => {
  const form = { email: 'A@b.co', consent: 'on', consentTextVersion: '2', sectionId: 'home-newsletter' };

  it('reads the checkbox and numeric version as an HTML form posts them', () => {
    expect(newsletterFormSchema.parse(form)).toEqual({
      email: 'a@b.co',
      consent: true,
      consentTextVersion: 2,
      sectionId: 'home-newsletter',
    });
  });

  it('rejects an unchecked box', () => {
    const { consent: _consent, ...unchecked } = form;
    expect(newsletterFormSchema.safeParse(unchecked).success).toBe(false);
  });
});

describe('adminNewsletterListQuerySchema', () => {
  it('defaults the page and accepts a status filter', () => {
    expect(adminNewsletterListQuerySchema.parse({})).toEqual({ page: 1 });
    expect(adminNewsletterListQuerySchema.parse({ status: 'unsubscribed', page: '3' })).toMatchObject({
      status: 'unsubscribed',
      page: 3,
    });
  });

  it('rejects an unknown status', () => {
    expect(adminNewsletterListQuerySchema.safeParse({ status: 'pending' }).success).toBe(false);
  });
});

describe('results', () => {
  it('lists the four redirect outcomes', () => {
    expect([...NEWSLETTER_RESULTS]).toEqual(['ok', 'invalid', 'rate', 'stale', 'error']);
  });
});
