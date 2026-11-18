import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import {
  DESKTOP_IMPORT_VERSION, IMPORT_SCOPE, MEDIA_UPLOAD_FIELD, clientImportIdSchema,
  importCapabilitiesSchema, importCommitSchema, importHashSchema, importMediaReceiptSchema,
  importOperationReceiptSchema, importSessionDtoSchema, mediaKindSchema, startImportSessionSchema,
} from '@under30ss/shared';
import type { AppContext } from '../lib/app-context';
import { badRequest } from '../lib/app-error';
import { createImportRateLimit, importerAuth, requireImporter } from '../middleware/import-auth-middleware';
import { uploadImportMedia } from '../services/import-media-service';
import { commitImportOperation } from '../services/import-operation-service';
import { getImportSession, readImportSession, startImportSession } from '../services/import-session-service';
import { getUploadMaxMb } from '../services/settings-service';

const receiveFile = (req: Request, res: Response, maxBytes: number): Promise<void> => new Promise((resolve, reject) => {
  multer({ storage: multer.memoryStorage(), limits: { fileSize: maxBytes, files: 1, fields: 0, parts: 1 } })
    .single(MEDIA_UPLOAD_FIELD)(req, res, (error) => error ? reject(error) : resolve());
});

export const createImportRoutes = (ctx: AppContext): Router => {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.use(createImportRateLimit(ctx.env));
  router.use(requireImporter);
  router.get('/capabilities', async (_req, res) => {
    res.json(importCapabilitiesSchema.parse({
      contractVersion: DESKTOP_IMPORT_VERSION, scope: IMPORT_SCOPE,
      uploadMaxBytes: (await getUploadMaxMb(ctx.env)) * 1024 * 1024,
      sessionMaxMedia: ctx.env.IMPORT_SESSION_MAX_MEDIA, sessionMaxOperations: ctx.env.IMPORT_SESSION_MAX_OPERATIONS,
    }));
  });
  router.put('/sessions/:clientSessionId', async (req, res) => {
    const id = clientImportIdSchema.parse(req.params.clientSessionId);
    await startImportSession(importerAuth(res), id, startImportSessionSchema.parse(req.body), ctx.env);
    res.json(importSessionDtoSchema.parse(await readImportSession(importerAuth(res), id, ctx.env)));
  });
  router.get('/sessions/:clientSessionId', async (req, res) => {
    const id = clientImportIdSchema.parse(req.params.clientSessionId);
    res.json(importSessionDtoSchema.parse(await readImportSession(importerAuth(res), id, ctx.env)));
  });
  router.put('/sessions/:clientSessionId/media/:clientMediaId', async (req, res) => {
    const id = clientImportIdSchema.parse(req.params.clientSessionId);
    const clientMediaId = clientImportIdSchema.parse(req.params.clientMediaId);
    const kind = mediaKindSchema.parse(req.query.kind);
    const sha256 = importHashSchema.parse(req.get('X-Content-SHA256'));
    const session = await getImportSession(importerAuth(res), id);
    await receiveFile(req, res, (await getUploadMaxMb(ctx.env)) * 1024 * 1024);
    if (!req.file) throw badRequest('Chưa chọn ảnh', { file: 'File is required' });
    const receipt = await uploadImportMedia(ctx, session, { clientMediaId, sha256, kind, buffer: req.file.buffer, mimeType: req.file.mimetype });
    res.json(importMediaReceiptSchema.parse(receipt));
  });
  router.put('/sessions/:clientSessionId/operations/:operationId', async (req, res) => {
    const id = clientImportIdSchema.parse(req.params.clientSessionId);
    const operationId = clientImportIdSchema.parse(req.params.operationId);
    const input = importCommitSchema.parse(req.body);
    const session = await getImportSession(importerAuth(res), id);
    const receipt = importOperationReceiptSchema.parse(await commitImportOperation(ctx, session, operationId, input));
    res.status(receipt.status === 'processing' ? 202 : 200).json(receipt);
  });
  return router;
};
