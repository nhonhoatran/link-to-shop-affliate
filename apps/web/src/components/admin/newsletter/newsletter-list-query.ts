import { API_PATHS, newsletterStatusSchema, type AdminNewsletterSubscriberDto } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { parsePageParam } from '../collections/collection-list-query';

type NewsletterStatus = AdminNewsletterSubscriberDto['status'];

export interface NewsletterListQuery {
  q: string;
  status: NewsletterStatus | undefined;
  page: number;
}

type RawParam = string | string[] | undefined;
const first = (value: RawParam): string => (Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));

/** Lenient: a GET form submits empty params and URLs get edited by hand. */
export const parseNewsletterListQuery = (raw: Record<string, RawParam>): NewsletterListQuery => {
  const status = newsletterStatusSchema.safeParse(first(raw.status));
  return {
    q: first(raw.q).trim().slice(0, 100),
    status: status.success ? status.data : undefined,
    page: parsePageParam(raw.page),
  };
};

const withFilters = (base: string, query: NewsletterListQuery, page?: number): string => {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  if (page !== undefined && page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `${base}?${search}` : base;
};

export const buildNewsletterListHref = (query: NewsletterListQuery, page: number): string =>
  withFilters(ADMIN_PATHS.newsletter, query, page);

/** The export follows the current filters but always covers every page. */
export const buildNewsletterExportHref = (query: NewsletterListQuery): string =>
  withFilters(API_PATHS.admin.newsletterExport, query);
