import { outfitStatusSchema, type OutfitStatus } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';

export interface CollectionListQuery {
  q: string;
  status: OutfitStatus | undefined;
  page: number;
}

// The outfit list on the edit page pages with `op`, so it never fights another pager that may share the URL.
export const COLLECTION_OUTFIT_PAGE_PARAM = 'op';

export const collectionOutfitsPageHref = (id: string, page: number): string =>
  page > 1 ? `${ADMIN_PATHS.collectionEdit(id)}?${COLLECTION_OUTFIT_PAGE_PARAM}=${page}` : ADMIN_PATHS.collectionEdit(id);

type RawParam = string | string[] | undefined;
const first = (value: RawParam): string => (Array.isArray(value) ? (value[0] ?? '') : (value ?? ''));

export const parsePageParam = (raw: RawParam): number => {
  const page = Number.parseInt(first(raw), 10);
  return Number.isInteger(page) && page >= 1 ? page : 1;
};

/** Lenient like the outfit list: a GET form submits empty params and URLs get edited by hand. */
export const parseCollectionListQuery = (raw: Record<string, RawParam>): CollectionListQuery => {
  const status = outfitStatusSchema.safeParse(first(raw.status));
  return {
    q: first(raw.q).trim().slice(0, 100),
    status: status.success ? status.data : undefined,
    page: parsePageParam(raw.page),
  };
};

export const buildCollectionListHref = (query: CollectionListQuery, page: number): string => {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  if (page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `${ADMIN_PATHS.collections}?${search}` : ADMIN_PATHS.collections;
};
