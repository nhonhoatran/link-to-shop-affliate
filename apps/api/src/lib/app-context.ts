import type { Env } from '../config/env-config';
import type { ObjectStorage } from '../storage/s3-client';

// `{ scope: 'all' }` refreshes every page (site-wide changes) without enumerating slugs.
export type Revalidate = (target: string[] | { scope: 'all' }) => Promise<void>;

export interface AppContext {
  env: Env;
  storage: ObjectStorage;
  revalidate: Revalidate;
}
