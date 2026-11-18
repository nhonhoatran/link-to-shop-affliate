import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { percentRectSchema, type DesktopDraft, type PercentRect } from '@under30ss/shared';

export const pixelCrop = (rect: PercentRect, width: number, height: number) => {
  percentRectSchema.parse(rect);
  const left = Math.min(width - 1, Math.floor((rect.x / 100) * width));
  const top = Math.min(height - 1, Math.floor((rect.y / 100) * height));
  const right = Math.max(left + 1, Math.min(width, Math.ceil(((rect.x + rect.width) / 100) * width)));
  const bottom = Math.max(top + 1, Math.min(height, Math.ceil(((rect.y + rect.height) / 100) * height)));
  return { left, top, width: right - left, height: bottom - top };
};
export const normalizeSourceImage = async (bytes: Buffer, directory: string, maxPixels: number) => {
  const target = path.join(directory, 'source.png');
  await mkdir(directory, { recursive: true });
  const { data, info } = await sharp(bytes, { limitInputPixels: maxPixels, animated: false, failOn: 'error' })
    .rotate().png().toBuffer({ resolveWithObject: true });
  await writeFile(target, data, { flag: 'wx', mode: 0o600 });
  return { path: target, width: info.width, height: info.height };
};
export const createDraftAssets = async (
  directory: string, source: string, width: number, height: number, draft: DesktopDraft,
) => {
  const assets: Record<string, string> = {};
  const writeCrop = async (id: string, rect: PercentRect) => {
    const filename = `${id}.png`;
    const buffer = await sharp(source, { limitInputPixels: width * height, failOn: 'error' })
      .extract(pixelCrop(rect, width, height)).png().toBuffer();
    await writeFile(path.join(directory, filename), buffer, { mode: 0o600 });
    assets[id] = filename;
    return id;
  };
  const modelAssetId = draft.modelCrop ? await writeCrop(`model-${randomUUID()}`, draft.modelCrop) : null;
  const itemAssetIds: Record<string, string> = {};
  for (const item of draft.items) {
    if (item.crop) itemAssetIds[item.id] = await writeCrop(`item-${randomUUID()}`, item.crop);
  }
  return { modelAssetId, itemAssetIds, assets };
};
