import type { AdminSettingsDto, PublicSettingsDto, SettingsInput } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { badRequest } from '../lib/app-error';
import { isPublicKey, PUBLIC_KEY_ERROR } from '../lib/public-key-prefix';
import { getDefaultSettings } from '../lib/runtime-defaults';
import { SettingsModel, type SettingsDoc } from '../models/settings-model';
import { createMediaUrlResolver } from './outfit-mapper';
import { toAdminChrome, toPublicChrome } from './settings-chrome-service';

type SettingsRecord = SettingsDoc;

export interface ListingSettings {
  looksPageSize: number;
  relatedOutfitsCount: number;
}

const loadSettings = (): Promise<SettingsRecord | null> => SettingsModel.findOne({ singleton: 'site' }).lean<SettingsRecord>();

const OPTIONAL_KEYS = [
  'uploadMaxMb',
  'looksPageSize',
  'relatedOutfitsCount',
  'collectionsNavEnabled',
  'collectionsLabel',
  'footer',
  'announcement',
] as const;

const assertWithinCeiling = (value: number | undefined, ceiling: number, field: string, label: string, unit: string): void => {
  if (value !== undefined && value > ceiling) {
    throw badRequest(`${label} không được vượt quá ${ceiling} ${unit}`, { [field]: `Tối đa ${ceiling} ${unit}` });
  }
};

export const getAdminSettings = async (env: Env): Promise<AdminSettingsDto> => {
  const stored = await loadSettings();
  if (!stored) return { ...getDefaultSettings(), ...toAdminChrome(null) };
  const resolveUrl = createMediaUrlResolver(env);
  const { siteName, seoTitle, seoDescription, ogImage, uploadMaxMb, looksPageSize, relatedOutfitsCount, updatedAt } = stored;
  return {
    siteName,
    seoTitle,
    seoDescription,
    ...(ogImage ? { ogImage: { key: ogImage.key, width: ogImage.width, height: ogImage.height, url: resolveUrl(ogImage.key) } } : {}),
    ...(uploadMaxMb ? { uploadMaxMb } : {}),
    ...(looksPageSize ? { looksPageSize } : {}),
    ...(relatedOutfitsCount ? { relatedOutfitsCount } : {}),
    ...toAdminChrome(stored),
    updatedAt: updatedAt.toISOString(),
  };
};

export const resolveListingSettings = (stored: SettingsRecord | null, env: Env): ListingSettings => ({
  looksPageSize: Math.min(stored?.looksPageSize ?? env.PUBLIC_LOOKS_PAGE_SIZE, env.PUBLIC_PAGE_SIZE_MAX),
  relatedOutfitsCount: Math.min(stored?.relatedOutfitsCount ?? env.PUBLIC_RELATED_OUTFITS_COUNT, env.PUBLIC_PAGE_SIZE_MAX),
});

// Clamped on read so lowering PUBLIC_PAGE_SIZE_MAX later also tightens values saved earlier.
export const getListingSettings = async (env: Env): Promise<ListingSettings> => resolveListingSettings(await loadSettings(), env);

export const getPublicSettings = async (env: Env): Promise<PublicSettingsDto> => {
  const stored = await loadSettings();
  const listing = resolveListingSettings(stored, env);
  const chrome = await toPublicChrome(stored);
  if (!stored) return { ...getDefaultSettings(), ogImageUrl: null, ...listing, ...chrome };
  const { siteName, seoTitle, seoDescription, ogImage } = stored;
  const ogImageUrl = ogImage ? createMediaUrlResolver(env)(ogImage.key) : null;
  return { siteName, seoTitle, seoDescription, ogImageUrl, ...listing, ...chrome };
};

export const updateSettings = async (input: SettingsInput, env: Env): Promise<AdminSettingsDto> => {
  if (input.ogImage && !isPublicKey(input.ogImage.key)) {
    throw badRequest('Ảnh không hợp lệ', { 'ogImage.key': PUBLIC_KEY_ERROR });
  }
  assertWithinCeiling(input.uploadMaxMb, env.UPLOAD_MAX_MB_CEILING, 'uploadMaxMb', 'Dung lượng ảnh tối đa', 'MB');
  assertWithinCeiling(input.looksPageSize, env.PUBLIC_PAGE_SIZE_MAX, 'looksPageSize', 'Số outfit mỗi trang', 'outfit');
  assertWithinCeiling(input.relatedOutfitsCount, env.PUBLIC_PAGE_SIZE_MAX, 'relatedOutfitsCount', 'Số outfit gợi ý', 'outfit');
  const { ogImage, ...required } = input;
  const set: Record<string, unknown> = { ...(ogImage ? { ogImage } : {}) };
  const unset: Record<string, 1> = {};
  for (const [key, value] of Object.entries(required)) {
    if (value === undefined) unset[key] = 1;
    else set[key] = value;
  }
  if (!ogImage) unset.ogImage = 1;
  for (const key of OPTIONAL_KEYS) if (!(key in set)) unset[key] = 1;
  await SettingsModel.findOneAndUpdate(
    { singleton: 'site' },
    { $set: set, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) },
    { upsert: true, runValidators: true },
  );
  return getAdminSettings(env);
};

// Clamped again on read so lowering the ceiling later also tightens limits saved earlier.
export const getUploadMaxMb = async (env: Env): Promise<number> =>
  Math.min((await loadSettings())?.uploadMaxMb ?? env.UPLOAD_MAX_MB, env.UPLOAD_MAX_MB_CEILING);
