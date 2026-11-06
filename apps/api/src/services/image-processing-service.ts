import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { MediaKind } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { AppError, badRequest } from '../lib/app-error';
import { PUBLIC_KEY_PREFIX } from '../lib/public-key-prefix';

// Decompression-bomb guard; a technical safety limit, not a business value.
const MAX_INPUT_PIXELS = 100_000_000;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif']);

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: 'image/webp';
}

const invalidImage = (): AppError =>
  badRequest('Tệp không phải ảnh hợp lệ (JPEG, PNG, WebP hoặc AVIF)', { file: 'Unsupported or corrupt image' });

const maxEdgeFor = (kind: MediaKind, env: Env): number =>
  kind === 'model' ? env.IMAGE_MAX_EDGE_MODEL : env.IMAGE_MAX_EDGE_ITEM;

export const processImage = async (input: Buffer, kind: MediaKind, env: Env): Promise<ProcessedImage> => {
  try {
    const source = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' });
    const meta = await source.metadata();
    // sharp reports AVIF as "heif" with AV1 compression; other HEIF flavours are rejected.
    const isAvif = meta.format === 'heif' && meta.compression === 'av1';
    const accepted = meta.format && ACCEPTED_FORMATS.has(meta.format) && (meta.format !== 'heif' || isAvif);
    if (!accepted) throw invalidImage();

    const edge = maxEdgeFor(kind, env);
    const { data, info } = await source
      .rotate()
      .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: env.WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height, contentType: 'image/webp' };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw invalidImage();
  }
};

export const buildMediaKey = (kind: MediaKind, now: Date = new Date()): string => {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${PUBLIC_KEY_PREFIX}${kind}/${year}/${month}/${randomUUID()}.webp`;
};
