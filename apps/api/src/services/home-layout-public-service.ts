import type { PublicHomeResponse } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { defaultHomeContent, loadHomeLayout, publishedHomeContent } from './home-layout-service';
import { resolveHomeSections } from './home-section-resolver-service';

/** Only the published layout is read here; the draft and `previous` never reach visitors. */
export const getPublicHome = async (env: Env): Promise<PublicHomeResponse> => {
  const published = publishedHomeContent(await loadHomeLayout());
  const sections = await resolveHomeSections(published ?? defaultHomeContent(), env);
  return { source: published ? 'published' : 'default', sections };
};
