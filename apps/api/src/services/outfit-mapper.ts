import {
  buildMediaUrl,
  type AdminOutfitDto,
  type AdminOutfitListItemDto,
  type ImageRef,
  type Outfit,
  type OutfitItem,
} from '@under30ss/shared';
import type { Env } from '../config/env-config';
import type { OutfitItemDoc, OutfitRecord } from '../models/outfit-model';

export const createMediaUrlResolver = (env: Env) => (key: string) => buildMediaUrl(env.MEDIA_PUBLIC_BASE_URL, key);

const toImage = ({ key, width, height }: ImageRef): ImageRef => ({ key, width, height });

const toItem = (item: OutfitItemDoc): OutfitItem => ({
  id: item.id,
  name: item.name,
  ...(item.subtitle ? { subtitle: item.subtitle } : {}),
  ...(item.description ? { description: item.description } : {}),
  image: toImage(item.image),
  side: item.side,
  order: item.order,
  ...(item.anchor ? { anchor: { x: item.anchor.x, y: item.anchor.y } } : {}),
  affiliateUrl: item.affiliateUrl,
});

export const toOutfit = (record: OutfitRecord): Outfit => ({
  id: String(record._id),
  slug: record.slug,
  title: record.title,
  ...(record.seoDescription ? { seoDescription: record.seoDescription } : {}),
  modelImage: toImage(record.modelImage),
  status: record.status,
  featured: record.featured,
  items: record.items.map(toItem),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const toAdminOutfitDto = (outfit: Outfit, resolveUrl: (key: string) => string): AdminOutfitDto => ({
  ...outfit,
  modelImage: { ...outfit.modelImage, url: resolveUrl(outfit.modelImage.key) },
  items: outfit.items.map((item) => ({ ...item, image: { ...item.image, url: resolveUrl(item.image.key) } })),
});

export const toAdminListItem = (
  record: OutfitRecord,
  resolveUrl: (key: string) => string,
): AdminOutfitListItemDto => ({
  id: String(record._id),
  slug: record.slug,
  title: record.title,
  status: record.status,
  featured: record.featured,
  updatedAt: record.updatedAt.toISOString(),
  modelImageUrl: resolveUrl(record.modelImage.key),
});
