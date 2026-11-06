import { outfitStatusSchema, type OutfitStatus } from '@under30ss/shared';

export interface OutfitListQuery {
  q: string;
  status: OutfitStatus | undefined;
  page: number;
}

type RawParam = string | string[] | undefined;
const first = (value: RawParam): string => (Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));

/** Lenient: a GET form submits empty params and users edit URLs by hand, so bad values fall back to defaults. */
export const parseOutfitListQuery = (raw: Record<string, RawParam>): OutfitListQuery => {
  const status = outfitStatusSchema.safeParse(first(raw.status));
  const page = Number.parseInt(first(raw.page), 10);
  return {
    q: first(raw.q).trim().slice(0, 100),
    status: status.success ? status.data : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
};

export const buildListHref = (query: OutfitListQuery, page: number): string => {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  if (page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `/admin?${search}` : '/admin';
};
