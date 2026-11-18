import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { outfitSchema } from '@under30ss/shared';
import { ImportClient } from '../../desktop/src/main/import-client';
import { syncApprovedSession } from '../../desktop/src/main/sync-session';
import { createSyncPayload, syncOperationId } from '../../desktop/src/main/sync-payload';
import { findStoredFile } from '../../desktop/src/main/session-store';
import { CollectionModel } from '../src/models/collection-model';
import { ImportOperationModel } from '../src/models/import-operation-model';
import { ImportSessionModel } from '../src/models/import-session-model';
import { OutfitModel } from '../src/models/outfit-model';
import { makeImporter } from './helpers/import-fixtures';
import { closeHttpServer, manualDesktopDraft, prepareDesktopHttp } from './helpers/desktop-import-fixtures';
import { startTestApp, type TestApp } from './helpers/test-app';

let app: TestApp;
let desktop: Awaited<ReturnType<typeof prepareDesktopHttp>>;
beforeAll(async () => { app = await startTestApp(); desktop = await prepareDesktopHttp(app); });
afterAll(async () => {
  if (desktop) { await closeHttpServer(desktop.server); await rm(desktop.root, { recursive: true, force: true }); }
  if (app) await app.stop();
});

describe('desktop main to actual importer HTTP', () => {
  it('sends only saved approved revisions and recovers a lost commit response without duplicates', async () => {
    const { token, admin } = await makeImporter(app);
    const runtime = desktop.runtime;
    const settings = (await runtime.invoke('readSettings', {})).settings;
    settings.siteUrl = desktop.origin;
    await runtime.invoke('saveSettings', { settings, token });
    const selection = await runtime.invoke('chooseFolder', {});
    if (!selection) throw new Error('Fixture folder selection failed');
    const session = await runtime.invoke('createSession', { selectionId: selection.selectionId, name: 'HTTP fixture' });
    const files = await runtime.invoke('listFiles', { sessionId: session.id, page: 1, size: 20 });
    expect(files.total).toBe(2);
    const [first, second] = files.items;
    if (!first || !second) throw new Error('Fixture images were not scanned');
    const signal = new AbortController().signal;
    let droppedReply = false;
    // Every request reaches the real listening Express server; only one successful reply is lost.
    const transport: typeof fetch = async (input, init) => {
      const response = await fetch(input, init);
      if (!droppedReply && init?.method === 'PUT' && new URL(String(input)).pathname.includes('/operations/') && response.ok) {
        droppedReply = true;
        await response.arrayBuffer();
        throw new Error('Simulated lost response after the server committed');
      }
      return response;
    };
    const client = new ImportClient(desktop.origin, token, 30_000, signal, transport);
    const sync = (activeRuntime = runtime) => syncApprovedSession(activeRuntime.store, session.id, client, signal, () => undefined);
    await expect(sync()).rejects.toThrow('Không có bản nháp đã duyệt');
    expect(await ImportSessionModel.countDocuments()).toBe(0);
    let saved = await runtime.invoke('updateDraft', { sessionId: session.id, fileId: first.id, expectedRevision: 0, draft: manualDesktopDraft('one') });
    await runtime.invoke('updateDraft', { sessionId: session.id, fileId: second.id, expectedRevision: 0, draft: manualDesktopDraft('two', 2) });
    await expect(sync()).rejects.toThrow('Không có bản nháp đã duyệt');
    await runtime.invoke('approve', { sessionId: session.id, fileId: first.id, expectedRevision: saved.revision });
    saved = await runtime.invoke('updateDraft', { sessionId: session.id, fileId: first.id, expectedRevision: saved.revision, draft: { ...saved.draft!, title: 'Tiêu đề đã sửa' } });
    expect(saved.approvedRevision).toBeNull();
    await expect(sync()).rejects.toThrow('Không có bản nháp đã duyệt');
    await runtime.invoke('approve', { sessionId: session.id, fileId: first.id, expectedRevision: saved.revision });
    await sync();
    expect(droppedReply).toBe(true);
    const synced = await runtime.invoke('getFile', { sessionId: session.id, fileId: first.id });
    expect(synced.status).toBe('synced');
    expect(synced.remote?.status).toBe('complete');
    expect((await runtime.invoke('getFile', { sessionId: session.id, fileId: second.id })).status).toBe('ready');
    expect(await OutfitModel.countDocuments()).toBe(1);
    expect(await CollectionModel.countDocuments()).toBe(1);
    expect(app.s3Puts).toHaveLength(2);
    const remote = synced.remote!;
    const response = await admin.get(`/api/admin/outfits/${remote.outfitId}`).expect(200);
    const outfit = outfitSchema.parse(response.body);
    expect(outfit).toMatchObject({ title: 'Tiêu đề đã sửa', status: 'draft', featured: false, collectionIds: [remote.collectionId] });
    expect(outfit.items[0]?.anchor).toEqual({ x: 50, y: 40 });
    expect((await CollectionModel.findById(remote.collectionId).lean())?.coverImage?.key).toBe(outfit.modelImage.key);
    const storedFile = findStoredFile(await runtime.store.get(session.id), first.id);
    expect((await client.commit(session.id, syncOperationId(storedFile), createSyncPayload(storedFile))).outfitId).toBe(remote.outfitId);
    // Emulate a checkpoint restored from before the reply, then reopen through the real stores.
    await runtime.store.change(session.id, (record) => {
      const entry = findStoredFile(record, first.id);
      entry.status = 'interrupted'; entry.remote = null;
    });
    const reopened = desktop.reopen();
    expect((await reopened.invoke('readSettings', {})).credential.configured).toBe(true);
    await sync(reopened);
    expect((await reopened.invoke('getFile', { sessionId: session.id, fileId: first.id })).remote).toEqual(remote);
    expect(await OutfitModel.countDocuments()).toBe(1);
    expect(app.s3Puts).toHaveLength(2);
    const remaining = await reopened.invoke('getFile', { sessionId: session.id, fileId: second.id });
    await reopened.invoke('approve', { sessionId: session.id, fileId: second.id, expectedRevision: remaining.revision });
    await sync(reopened);
    expect(await OutfitModel.countDocuments()).toBe(2);
    expect(await CollectionModel.countDocuments()).toBe(2);
    expect(await ImportOperationModel.countDocuments({ status: 'complete' })).toBe(2);
    expect(app.s3Puts).toHaveLength(5);
    const again = desktop.reopen();
    expect((await again.invoke('getSession', { sessionId: session.id })).counts.synced).toBe(2);
    const manifest = await readFile(path.join(runtime.store.directory(session.id), 'manifest.json'), 'utf8');
    expect(manifest).not.toContain(token);
    expect(JSON.stringify(await again.invoke('readSettings', {}))).not.toContain(token);
  });
});
