import type { ImageRef, MediaKind } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { buildMediaKey, processImage } from './image-processing-service';

// Long-lived caching is safe because every upload gets a new key.
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const storeImage = async (
  ctx: Pick<AppContext, 'env' | 'storage'>,
  kind: MediaKind,
  input: Buffer,
  key: string = buildMediaKey(kind),
): Promise<ImageRef> => {
  const processed = await processImage(input, kind, ctx.env);
  await ctx.storage.putObject({
    key,
    body: processed.buffer,
    contentType: processed.contentType,
    cacheControl: IMMUTABLE_CACHE_CONTROL,
  });
  return { key, width: processed.width, height: processed.height };
};
