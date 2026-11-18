import { createHash } from 'node:crypto';
import { vi } from 'vitest';
import { DESKTOP_IMPORT_VERSION, IMPORT_SCOPE, importCommitSchema,
  type ImportMediaReceipt, type ImportOperationReceipt, type ImportSessionDto } from '@under30ss/shared';
import { ImportClient } from '../../src/main/import-client';

export const testSiteToken = 'imp_test_sync_credential_0123456789abcdef';
export const importerFixture = () => {
  const media = new Map<string, ImportMediaReceipt>();
  const operations = new Map<string, ImportOperationReceipt>();
  const commitBodies: unknown[] = [];
  let metadata: Omit<ImportSessionDto, 'media' | 'operations'> | null = null;
  const behavior = { failBeforeCommit: 0, loseCommitResponse: false, uploadMaxBytes: 1_000_000,
    sessionMaxMedia: 100, sessionMaxOperations: 20,
    afterUpload: (() => undefined) as () => void };
  const snapshot = (): ImportSessionDto => {
    if (!metadata) throw new Error('Test session has not started');
    return { ...metadata, media: [...media.values()], operations: [...operations.values()] };
  };
  const transport = vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    if (headers.get('Authorization') !== `Bearer ${testSiteToken}`) return Response.json({ error: { message: 'Invalid test token' } }, { status: 401 });
    if (url.pathname === '/api/import/capabilities') return Response.json({
      contractVersion: DESKTOP_IMPORT_VERSION, scope: IMPORT_SCOPE, uploadMaxBytes: behavior.uploadMaxBytes,
      sessionMaxMedia: behavior.sessionMaxMedia, sessionMaxOperations: behavior.sessionMaxOperations,
    });
    const parts = url.pathname.split('/');
    if (parts.length === 5 && init?.method === 'PUT') {
      metadata = { ...JSON.parse(String(init.body)), clientSessionId: parts[4]! };
      return Response.json(snapshot());
    }
    if (parts.length === 5 && init?.method === 'GET') return Response.json(snapshot());
    if (parts[5] === 'media') {
      const id = decodeURIComponent(parts[6]!);
      const bytes = Buffer.from(await ((init!.body as FormData).get('file') as Blob).arrayBuffer());
      const receipt: ImportMediaReceipt = { clientMediaId: id, sha256: createHash('sha256').update(bytes).digest('hex'),
        kind: url.searchParams.get('kind') as 'model' | 'item',
        image: { key: `public/import-tests/${id}.webp`, url: `https://media.test/${id}.webp`, width: 100, height: 200 } };
      if (receipt.sha256 !== headers.get('X-Content-SHA256')) throw new Error('Client checksum differs from uploaded bytes');
      media.set(id, receipt); behavior.afterUpload(); return Response.json(receipt);
    }
    if (parts[5] === 'operations') {
      const payload = importCommitSchema.parse(JSON.parse(String(init!.body)));
      commitBodies.push(payload);
      if (behavior.failBeforeCommit > 0) { behavior.failBeforeCommit--; throw new Error('Simulated lost request before commit'); }
      const id = decodeURIComponent(parts[6]!);
      const receipt: ImportOperationReceipt = { operationId: id, payloadHash: payload.payloadHash, status: 'complete',
        collectionId: 'a'.repeat(24), outfitId: 'b'.repeat(24),
        adminCollectionPath: `/admin/collections/${'a'.repeat(24)}`, adminOutfitPath: `/admin/outfits/${'b'.repeat(24)}` };
      operations.set(id, receipt);
      if (behavior.loseCommitResponse) { behavior.loseCommitResponse = false; throw new Error('Simulated lost response after commit'); }
      return Response.json(receipt);
    }
    throw new Error(`Unexpected test request ${init?.method} ${url.pathname}`);
  });
  const controller = new AbortController();
  const client = new ImportClient('https://website.test', testSiteToken, 3000, controller.signal, transport);
  const uploads = () => transport.mock.calls.filter(([url]) => new URL(String(url)).pathname.includes('/media/'));
  return { media, operations, behavior, transport, client, controller, commitBodies, uploads };
};
