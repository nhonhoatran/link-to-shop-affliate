import { MAX_COLLECTION_SEARCH_LENGTH } from '@under30ss/shared';

/** Bound manually edited URLs before forwarding them to the public API. */
export const parseCollectionSearchParam = (value: string | string[] | undefined): string =>
  (typeof value === 'string' ? value : '').trim().slice(0, MAX_COLLECTION_SEARCH_LENGTH);
