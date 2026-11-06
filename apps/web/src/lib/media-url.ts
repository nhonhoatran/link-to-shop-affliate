import { buildMediaUrl } from '@under30ss/shared';
import { getWebEnv } from './web-env';

/** Server-only: public URLs normally arrive inside DTOs; use this only when a bare storage key is at hand. */
export const mediaUrl = (key: string): string => buildMediaUrl(getWebEnv().MEDIA_PUBLIC_BASE_URL, key);
