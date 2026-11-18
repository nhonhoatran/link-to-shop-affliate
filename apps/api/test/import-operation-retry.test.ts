import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OutfitModel } from '../src/models/outfit-model';
import { CollectionModel } from '../src/models/collection-model';
import { ImportOperationModel } from '../src/models/import-operation-model';
import { startTestApp, type TestApp } from './helpers/test-app';
import { commit, content, makeImporter, payload, readySession, sessionPath } from './helpers/import-fixtures';

let testApp: TestApp;
let token: string;
beforeEach(async () => {
  testApp = await startTestApp();
  token = (await makeImporter(testApp)).token;
  await readySession(testApp, token);
});
afterEach(async () => { await testApp.stop(); });

describe('desktop import durable operations', () => {
  it('creates draft collection, cover and outfit membership, and replays without new entities', async () => {
    const first = await commit(testApp, token).expect(200);
    expect(first.body).toMatchObject({ operationId: 'operation-1', status: 'complete' });
    const outfit = await OutfitModel.findById(first.body.outfitId).lean();
    const collection = await CollectionModel.findById(first.body.collectionId).lean();
    expect(outfit).toMatchObject({ status: 'draft', featured: false, title: 'Trang phục thử', showArrows: false });
    expect(outfit?.collectionIds?.map(String)).toEqual([first.body.collectionId]);
    expect(outfit?.items[0]?.image.key).toMatch(/^public\/import\//);
    expect(collection).toMatchObject({ status: 'draft', name: 'Bộ sưu tập thử', coverImage: outfit?.modelImage });
    expect(testApp.revalidateHits).toHaveLength(2);
    const retry = await commit(testApp, token).expect(200);
    expect(retry.body).toEqual(first.body);
    expect(await OutfitModel.countDocuments()).toBe(1);
    expect(await CollectionModel.countDocuments()).toBe(1);
    expect(testApp.revalidateHits).toHaveLength(2);
    const reconcile = await supertest(testApp.app).get(sessionPath()).auth(token, { type: 'bearer' }).expect(200);
    expect(reconcile.body.operations).toEqual([first.body]);
    expect(first.body.adminOutfitPath).toBe(`/admin/outfits/${first.body.outfitId}`);
  });

  it('rejects a changed payload hash and prevents overwrite under the same operation ID', async () => {
    const wrong = { ...payload(), payloadHash: '0'.repeat(64) };
    await commit(testApp, token, wrong).expect(400);
    expect(await ImportOperationModel.countDocuments()).toBe(0);
    await commit(testApp, token).expect(200);
    const changed = content();
    changed.outfit.title = 'Tên khác';
    await commit(testApp, token, payload(changed)).expect(409);
    expect((await OutfitModel.findOne().lean())?.title).toBe('Trang phục thử');
  });

  it('concurrent requests claim one intent and converge on identical remote IDs', async () => {
    const responses = await Promise.all([commit(testApp, token), commit(testApp, token), commit(testApp, token)]);
    expect(responses.map((response) => response.status).every((status) => status === 200 || status === 202)).toBe(true);
    expect(responses.some((response) => response.body.status === 'complete')).toBe(true);
    const retry = await commit(testApp, token).expect(200);
    expect(retry.body.status).toBe('complete');
    expect(await ImportOperationModel.countDocuments()).toBe(1);
    expect(await OutfitModel.countDocuments()).toBe(1);
    expect(await CollectionModel.countDocuments()).toBe(1);
  });

  it('recovers a crash after entity creation before receipt completion without duplicate drafts', async () => {
    const first = await commit(testApp, token).expect(200);
    await ImportOperationModel.updateOne({ operationId: 'operation-1' }, {
      $set: { status: 'processing', collectionCreated: false, outfitCreated: false, leaseUntil: new Date(0) },
      $unset: { leaseOwner: 1 },
    });
    const reconciled = await supertest(testApp.app).get(sessionPath()).auth(token, { type: 'bearer' }).expect(200);
    expect(reconciled.body.operations[0]).toMatchObject({ collectionId: first.body.collectionId, outfitId: first.body.outfitId });
    const retry = await commit(testApp, token).expect(200);
    expect(retry.body).toEqual(first.body);
    expect(await OutfitModel.countDocuments()).toBe(1);
    expect(await CollectionModel.countDocuments()).toBe(1);
  });

  it('retains partial progress when completion fails, then retries the same intent safely', async () => {
    const revalidate = testApp.ctx.revalidate;
    testApp.ctx.revalidate = async () => { throw new Error('Simulated crash after writes'); };
    await commit(testApp, token).expect(500);
    const receipt = (await supertest(testApp.app).get(sessionPath()).auth(token, { type: 'bearer' }).expect(200)).body.operations[0];
    expect(receipt.status).toBe('failed');
    expect(receipt.collectionId).toBeDefined();
    expect(receipt.outfitId).toBeDefined();
    testApp.ctx.revalidate = revalidate;
    const retry = await commit(testApp, token).expect(200);
    expect(retry.body).toMatchObject({ status: 'complete', collectionId: receipt.collectionId, outfitId: receipt.outfitId });
    expect(await OutfitModel.countDocuments()).toBe(1);
    expect(await CollectionModel.countDocuments()).toBe(1);
  });

  it('does not overwrite an existing slug or resurrect a deleted completed result', async () => {
    const first = await commit(testApp, token).expect(200);
    await commit(testApp, token, payload(), 'operation-2').expect(409);
    await OutfitModel.deleteOne({ _id: first.body.outfitId });
    expect((await commit(testApp, token).expect(200)).body).toEqual(first.body);
    expect(await OutfitModel.countDocuments()).toBe(0);
    expect(await CollectionModel.countDocuments()).toBe(1);
  });

  it('preflights an outfit slug conflict before creating its collection', async () => {
    await commit(testApp, token).expect(200);
    const conflicting = content('two');
    conflicting.outfit.slug = content().outfit.slug;
    await commit(testApp, token, payload(conflicting), 'operation-2').expect(409);
    expect(await CollectionModel.countDocuments()).toBe(1);
    const response = await supertest(testApp.app).get(sessionPath()).auth(token, { type: 'bearer' }).expect(200);
    const failed = response.body.operations.find((operation: { operationId: string }) => operation.operationId === 'operation-2');
    expect(failed).toMatchObject({ status: 'failed' });
    expect(failed.collectionId).toBeUndefined();
    expect(failed.outfitId).toBeUndefined();
    expect(failed.retryOnly).toBeUndefined();
    // A prior worker may have passed the write fence but not finished an entity insert yet.
    await ImportOperationModel.updateOne({ operationId: 'operation-2' }, { $set: { writeStarted: true } });
    const uncertain = await supertest(testApp.app).get(sessionPath()).auth(token, { type: 'bearer' }).expect(200);
    const retryOnly = uncertain.body.operations.find((operation: { operationId: string }) => operation.operationId === 'operation-2');
    expect(retryOnly).toMatchObject({ status: 'failed', retryOnly: true });
    expect(retryOnly.collectionId).toBeUndefined();
  });
});
