import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { approveDesktopDraft, saveDesktopDraft } from '../../src/main/draft-actions';
import { ImportClient } from '../../src/main/import-client';
import { SessionStore } from '../../src/main/session-store';
import { createSyncPayload, syncOperationId } from '../../src/main/sync-payload';
import { syncApprovedSession } from '../../src/main/sync-session';
import { importerFixture, testSiteToken } from './import-transport-fixture';
import { cleanupDirectories, draftFixture, imageFixture, sessionFixture } from './test-fixtures';

afterEach(cleanupDirectories);
const approve = async (fixture: Awaited<ReturnType<typeof sessionFixture>>) => {
  await saveDesktopDraft(fixture.store, fixture.session.id, fixture.file.id, 0, draftFixture());
  await approveDesktopDraft(fixture.store, fixture.session.id, fixture.file.id, 1);
};
const sync = (fixture: Awaited<ReturnType<typeof sessionFixture>>, remote: ReturnType<typeof importerFixture>, store = fixture.store) =>
  syncApprovedSession(store, fixture.session.id, remote.client, remote.controller.signal, () => undefined);

describe('approved import synchronization', () => {
  it('never sends an unapproved draft and skips other unapproved images', async () => {
    const fixture = await sessionFixture(2); const remote = importerFixture();
    await saveDesktopDraft(fixture.store, fixture.session.id, fixture.file.id, 0, draftFixture());
    await expect(sync(fixture, remote)).rejects.toThrow('đã duyệt');
    expect(remote.transport).not.toHaveBeenCalled();
    await approveDesktopDraft(fixture.store, fixture.session.id, fixture.file.id, 1);
    await sync(fixture, remote);
    const record = await fixture.store.get(fixture.session.id);
    expect(record.files.filter((file) => file.status === 'synced')).toHaveLength(1);
    expect(record.files.filter((file) => file.status === 'pending')).toHaveLength(1);
    expect(remote.commitBodies).toHaveLength(1);
  });
  it('retries the same operation and checksum after reconnecting without reuploading receipts', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    remote.behavior.sessionMaxMedia = 2; remote.behavior.sessionMaxOperations = 1;
    remote.behavior.failBeforeCommit = 1;
    await sync(fixture, remote);
    const first = (await fixture.store.get(fixture.session.id)).files[0]!;
    expect(first.status).toBe('error'); expect(first.remote?.status).toBe('processing');
    const reloaded = new SessionStore(fixture.store.root);
    await sync(fixture, remote, reloaded);
    const result = (await reloaded.get(fixture.session.id)).files[0]!;
    expect(result.status).toBe('synced'); expect(result.remote?.outfitId).toBe('b'.repeat(24));
    expect(remote.commitBodies).toHaveLength(2); expect(remote.commitBodies[0]).toEqual(remote.commitBodies[1]);
    expect(remote.uploads()).toHaveLength(2);
    expect(remote.transport.mock.calls.filter(([url]) => String(url).includes('/operations/')).map(([url]) => String(url)))
      .toEqual([`https://website.test/api/import/sessions/${fixture.session.id}/operations/${fixture.file.id}-r1`,
        `https://website.test/api/import/sessions/${fixture.session.id}/operations/${fixture.file.id}-r1`]);
  });
  it('reconciles an uncertain response using GET instead of creating another operation', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    remote.behavior.loseCommitResponse = true;
    await sync(fixture, remote);
    expect((await fixture.store.get(fixture.session.id)).files[0]!.status).toBe('synced');
    expect(remote.commitBodies).toHaveLength(1);
    expect(remote.transport.mock.calls.some(([, init]) => init?.method === 'GET')).toBe(true);
  });
  it('rejects a changed token or destination before any request, including after restart', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    remote.behavior.failBeforeCommit = 1; await sync(fixture, remote);
    const transport = vi.fn<typeof fetch>(); const signal = new AbortController().signal;
    const reopened = new SessionStore(fixture.store.root);
    const tokenB = 'imp_test_different_owner_abcdef012345';
    await expect(syncApprovedSession(reopened, fixture.session.id,
      new ImportClient(remote.client.origin, tokenB, 1000, signal, transport), signal, () => undefined)).rejects.toThrow('token khác');
    await expect(syncApprovedSession(reopened, fixture.session.id,
      new ImportClient('https://other.test', testSiteToken, 1000, signal, transport), signal, () => undefined)).rejects.toThrow('website khác');
    expect(transport).not.toHaveBeenCalled();
    const manifest = await readFile(path.join(reopened.directory(fixture.session.id), 'manifest.json'), 'utf8');
    expect(manifest).not.toContain(testSiteToken); expect(manifest).not.toContain(tokenB);
    const record = await reopened.get(fixture.session.id);
    expect(record.credentialFingerprint).toBe(remote.client.credentialFingerprint);
    expect(record.session).not.toHaveProperty('credentialFingerprint');
  });
  it('does not commit changed content against an existing operation receipt', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    const file = (await fixture.store.get(fixture.session.id)).files[0]!;
    const payload = createSyncPayload(file);
    remote.operations.set(syncOperationId(file), { operationId: syncOperationId(file), payloadHash: payload.payloadHash === 'a'.repeat(64) ? 'b'.repeat(64) : 'a'.repeat(64), status: 'processing' });
    await sync(fixture, remote);
    const result = (await fixture.store.get(fixture.session.id)).files[0]!;
    expect(result.status).toBe('error'); expect(result.error).toContain('khác phiên bản');
    expect(remote.commitBodies).toHaveLength(0); expect(remote.uploads()).toHaveLength(0);
  });
  it('blocks mutated crop bytes that disagree with a previously uploaded receipt', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    remote.behavior.failBeforeCommit = 1; await sync(fixture, remote);
    const file = (await fixture.store.get(fixture.session.id)).files[0]!;
    await writeFile(await fixture.store.assetPath(fixture.session.id, file.modelAssetId!), await imageFixture(10, 10));
    await sync(fixture, remote);
    expect((await fixture.store.get(fixture.session.id)).files[0]!.error).toContain('Ảnh local khác receipt');
    expect(remote.commitBodies).toHaveLength(1); expect(remote.uploads()).toHaveLength(2);
  });
  it('keeps an upload interruption retryable and never reports it as completed', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    remote.behavior.afterUpload = () => remote.controller.abort();
    await sync(fixture, remote);
    const file = (await fixture.store.get(fixture.session.id)).files[0]!;
    expect(file.status).toBe('interrupted'); expect(file.remote?.status).not.toBe('complete');
    expect(remote.commitBodies).toHaveLength(0);
  });
  it('checks upload limits before any oversized image is sent', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    remote.behavior.uploadMaxBytes = 1; await sync(fixture, remote);
    expect((await fixture.store.get(fixture.session.id)).files[0]!.error).toContain('vượt dung lượng');
    expect(remote.uploads()).toHaveLength(0); expect(remote.commitBodies).toHaveLength(0);
  });
  it('rejects media demand beyond the website capability before sending any additional image', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    remote.behavior.sessionMaxMedia = 1;
    await expect(sync(fixture, remote)).rejects.toThrow('vượt hạn mức website');
    expect(remote.uploads()).toHaveLength(0); expect(remote.commitBodies).toHaveLength(0);
    const record = await fixture.store.get(fixture.session.id);
    expect(record.session.destinationOrigin).toBe(remote.client.origin);
    expect(record.credentialFingerprint).toBe(remote.client.credentialFingerprint);
    expect(record.files[0]!.status).toBe('approved');
  });
  it('rejects too many approved operations using the server capability before upload or commit', async () => {
    const fixture = await sessionFixture(2); const remote = importerFixture(); await approve(fixture);
    const other = (await fixture.store.get(fixture.session.id)).files.find((file) => file.id !== fixture.file.id)!;
    await saveDesktopDraft(fixture.store, fixture.session.id, other.id, 0, draftFixture());
    await approveDesktopDraft(fixture.store, fixture.session.id, other.id, 1);
    remote.behavior.sessionMaxOperations = 1;
    await expect(sync(fixture, remote)).rejects.toThrow('vượt hạn mức website');
    expect(remote.uploads()).toHaveLength(0); expect(remote.commitBodies).toHaveLength(0);
  });
  it('does not resume a legacy remote checkpoint that lacks the original token identity', async () => {
    const fixture = await sessionFixture(); const remote = importerFixture(); await approve(fixture);
    await fixture.store.change(fixture.session.id, (record) => { record.session.destinationOrigin = remote.client.origin; });
    await expect(sync(fixture, remote, new SessionStore(fixture.store.root))).rejects.toThrow('thiếu danh tính token');
    expect(remote.transport).not.toHaveBeenCalled();
  });
});
