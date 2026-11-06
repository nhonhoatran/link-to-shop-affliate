import type { AdminSettingsDto, PublicSettingsDto, SettingsInput } from '@under30ss/shared';
import type { Env } from '../config/env-config';
import { badRequest } from '../lib/app-error';
import { isPublicKey, PUBLIC_KEY_ERROR } from '../lib/public-key-prefix';
import { getDefaultSettings } from '../lib/runtime-defaults';
import { SettingsModel, type SettingsDoc } from '../models/settings-model';
import { createMediaUrlResolver } from './outfit-mapper';

type SettingsRecord = SettingsDoc;

const loadSettings = (): Promise<SettingsRecord | null> => SettingsModel.findOne({ singleton: 'site' }).lean<SettingsRecord>();

export const getAdminSettings = async (env: Env): Promise<AdminSettingsDto> => {
  const stored = await loadSettings();
  if (!stored) return getDefaultSettings();
  const resolveUrl = createMediaUrlResolver(env);
  const { siteName, seoTitle, seoDescription, ogImage, uploadMaxMb, updatedAt } = stored;
  return {
    siteName,
    seoTitle,
    seoDescription,
    ...(ogImage ? { ogImage: { key: ogImage.key, width: ogImage.width, height: ogImage.height, url: resolveUrl(ogImage.key) } } : {}),
    ...(uploadMaxMb ? { uploadMaxMb } : {}),
    updatedAt: updatedAt.toISOString(),
  };
};

export const getPublicSettings = async (env: Env): Promise<PublicSettingsDto> => {
  const stored = await loadSettings();
  if (!stored) return { ...getDefaultSettings(), ogImageUrl: null };
  const { siteName, seoTitle, seoDescription, ogImage } = stored;
  return { siteName, seoTitle, seoDescription, ogImageUrl: ogImage ? createMediaUrlResolver(env)(ogImage.key) : null };
};

export const updateSettings = async (input: SettingsInput, env: Env): Promise<AdminSettingsDto> => {
  if (input.ogImage && !isPublicKey(input.ogImage.key)) {
    throw badRequest('Ảnh không hợp lệ', { 'ogImage.key': PUBLIC_KEY_ERROR });
  }
  if (input.uploadMaxMb !== undefined && input.uploadMaxMb > env.UPLOAD_MAX_MB_CEILING) {
    throw badRequest(`Dung lượng ảnh tối đa không được vượt quá ${env.UPLOAD_MAX_MB_CEILING} MB`, {
      uploadMaxMb: `Tối đa ${env.UPLOAD_MAX_MB_CEILING} MB`,
    });
  }
  const { ogImage, uploadMaxMb, ...required } = input;
  const unset: Record<string, 1> = {};
  if (!ogImage) unset.ogImage = 1;
  if (uploadMaxMb === undefined) unset.uploadMaxMb = 1;
  await SettingsModel.findOneAndUpdate(
    { singleton: 'site' },
    {
      $set: { ...required, ...(ogImage ? { ogImage } : {}), ...(uploadMaxMb === undefined ? {} : { uploadMaxMb }) },
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
    { upsert: true, runValidators: true },
  );
  return getAdminSettings(env);
};

// Clamped again on read so lowering the ceiling later also tightens limits saved earlier.
export const getUploadMaxMb = async (env: Env): Promise<number> =>
  Math.min((await loadSettings())?.uploadMaxMb ?? env.UPLOAD_MAX_MB, env.UPLOAD_MAX_MB_CEILING);
