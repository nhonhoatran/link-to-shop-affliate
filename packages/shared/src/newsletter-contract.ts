import { z } from 'zod';
import { MAX_LIST_PAGE, type Paginated } from './api-contract';
import { MAX_SECTION_ID_LENGTH } from './home-sections/section-common-schemas';

// Double opt-in would add 'pending'.
export const NEWSLETTER_STATUSES = ['subscribed', 'unsubscribed'] as const;
export const NEWSLETTER_SOURCES = ['home'] as const;
export const NEWSLETTER_EVENT_TYPES = ['subscribe', 'unsubscribe'] as const;
export const NEWSLETTER_EVENT_ACTORS = ['self', 'admin'] as const;

// Technical bound: the maximum length of an email address (RFC 5321).
export const MAX_EMAIL_LENGTH = 254;
const MAX_HONEYPOT_LENGTH = 200;

export const newsletterStatusSchema = z.enum(NEWSLETTER_STATUSES);
export const newsletterSourceSchema = z.enum(NEWSLETTER_SOURCES);

export const newsletterEmailSchema = z.string().trim().toLowerCase().email().max(MAX_EMAIL_LENGTH);

// `consent` must be literally true: a call without the checkbox is rejected by the API too.
export const newsletterSubscribeRequestSchema = z.object({
  email: newsletterEmailSchema,
  consent: z.literal(true),
  consentTextVersion: z.number().int().min(1),
  source: newsletterSourceSchema,
  // Honeypot: real visitors never fill it in.
  website: z.string().max(MAX_HONEYPOT_LENGTH).optional(),
});
export type NewsletterSubscribeRequest = z.infer<typeof newsletterSubscribeRequestSchema>;

// The same request as an HTML form posts it (all strings, checkbox is 'on').
export const newsletterFormSchema = z.object({
  email: newsletterEmailSchema,
  consent: z.literal('on').transform((): true => true),
  consentTextVersion: z.coerce.number().int().min(1),
  sectionId: z.string().min(1).max(MAX_SECTION_ID_LENGTH),
  website: z.string().max(MAX_HONEYPOT_LENGTH).optional(),
});
export type NewsletterFormInput = z.infer<typeof newsletterFormSchema>;

// Lenient on purpose: a bad filter in the URL falls back to the default instead of failing the page.
export const adminNewsletterListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: newsletterStatusSchema.optional(),
  page: z.coerce.number().int().min(1).max(MAX_LIST_PAGE).default(1),
  // Default and maximum are enforced by the API from ADMIN_PAGE_SIZE_* env.
  size: z.coerce.number().int().min(1).optional(),
});
export type AdminNewsletterListQuery = z.input<typeof adminNewsletterListQuerySchema>;

// Append-only history; the current status is derived from the latest event.
export interface NewsletterConsentEventDto {
  type: (typeof NEWSLETTER_EVENT_TYPES)[number];
  at: string;
  actor: (typeof NEWSLETTER_EVENT_ACTORS)[number];
  source?: (typeof NEWSLETTER_SOURCES)[number];
  textVersion?: number;
}

export interface AdminNewsletterSubscriberDto {
  id: string;
  email: string;
  status: z.infer<typeof newsletterStatusSchema>;
  createdAt: string;
  updatedAt: string;
  events: NewsletterConsentEventDto[];
}
export type AdminNewsletterListResponse = Paginated<AdminNewsletterSubscriberDto>;

// The consent sentence shown next to the checkbox on the public form.
export interface NewsletterConsentDto {
  text: string;
  version: number;
  privacyHref?: string;
  privacyLabel: string;
}

// Result of a form post, carried back to the page in this query parameter (post/redirect/get).
export const NEWSLETTER_RESULT_PARAM = 'newsletter';
export const NEWSLETTER_RESULTS = ['ok', 'invalid', 'rate', 'stale', 'error'] as const;
export type NewsletterResult = (typeof NEWSLETTER_RESULTS)[number];
