import type { HomeLayoutContent } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { badRequest } from '../lib/app-error';
import { isPublicKey, PUBLIC_KEY_ERROR } from '../lib/public-key-prefix';
import { listSectionImageKeys, stripSectionImageUrls } from './home-section-image-mapper';

/**
 * Checks the rules zod cannot know (env ceiling, bucket prefix) and returns the content ready to store,
 * with image URLs removed. Field paths mirror the request body (`content.<index>...`).
 */
export const assertHomeLayoutLimits = (content: HomeLayoutContent, env: Env): HomeLayoutContent => {
  const fields: Record<string, string> = {};
  content.forEach((section, index) => {
    const base = `content.${index}.props`;
    if ((section.type === 'OutfitList' || section.type === 'CollectionTiles') && section.props.count !== undefined) {
      if (section.props.count > env.PUBLIC_PAGE_SIZE_MAX) fields[`${base}.count`] = `Tối đa ${env.PUBLIC_PAGE_SIZE_MAX}`;
    }
    for (const { path, key } of listSectionImageKeys(section)) {
      if (!isPublicKey(key)) fields[`${base}.${path}`] = PUBLIC_KEY_ERROR;
    }
  });
  if (Object.keys(fields).length > 0) throw badRequest('Bố cục trang chủ không hợp lệ', fields);
  return content.map(stripSectionImageUrls);
};
