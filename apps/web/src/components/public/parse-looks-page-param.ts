import { MAX_LIST_PAGE } from '@under30ss/shared';

/** Lenient: anything that is not a positive integer string is treated as page 1. */
export function parseLooksPageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? Math.min(page, MAX_LIST_PAGE) : 1;
}
