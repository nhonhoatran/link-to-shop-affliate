import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { MEDIA_UPLOAD_FIELD, buildMediaUrl, mediaKindSchema, type MediaUploadResponse } from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { badRequest } from '../lib/app-error';
import { storeImage } from '../services/media-service';
import { getUploadMaxMb } from '../services/settings-service';

const BYTES_PER_MB = 1024 * 1024;

const receiveFile = (req: Request, res: Response, maxBytes: number): Promise<void> => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 0 },
  }).single(MEDIA_UPLOAD_FIELD);
  return new Promise((resolve, reject) => upload(req, res, (error) => (error ? reject(error) : resolve())));
};

export const createAdminMediaRoutes = (ctx: AppContext): Router => {
  const router = Router();

  router.post('/', async (req, res) => {
    const kind = mediaKindSchema.safeParse(req.query.kind);
    if (!kind.success) throw badRequest('Loại ảnh không hợp lệ', { kind: 'Must be "model" or "item"' });

    await receiveFile(req, res, (await getUploadMaxMb(ctx.env)) * BYTES_PER_MB);
    if (!req.file) throw badRequest('Chưa chọn tệp ảnh', { file: 'File is required' });

    const image = await storeImage(ctx, kind.data, req.file.buffer);
    const body: MediaUploadResponse = { ...image, url: buildMediaUrl(ctx.env.MEDIA_PUBLIC_BASE_URL, image.key) };
    res.status(201).json(body);
  });

  return router;
};
