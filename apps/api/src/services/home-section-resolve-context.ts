import type { PublicOutfitDto } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import type { ListingSettings } from './settings-service';

export interface ResolveContext {
  env: Env;
  listing: ListingSettings;
  resolveUrl: (key: string) => string;
  featured: () => Promise<PublicOutfitDto | null>;
}

/** Keeps the order the admin picked; ids that no longer match a record are skipped. */
export const orderByIds = <T extends { _id: unknown }>(records: T[], ids: string[]): T[] => {
  const byId = new Map(records.map((record) => [String(record._id), record]));
  return ids.flatMap((id) => {
    const record = byId.get(id);
    return record ? [record] : [];
  });
};
