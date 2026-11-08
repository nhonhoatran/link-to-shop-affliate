import type { RevalidateRequest } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import type { ObjectStorage } from '../storage/s3-client';

// `{ scope: 'all' }` refreshes every page (site-wide changes) without enumerating slugs.
// A plain array means "paths only"; the object form can also expire fetch cache tags.
export type Revalidate = (target: string[] | RevalidateRequest) => Promise<void>;

export interface AppContext {
  env: Env;
  storage: ObjectStorage;
  revalidate: Revalidate;
}
