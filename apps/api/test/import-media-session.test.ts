import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OutfitModel } from '../src/models/outfit-model';
import { CollectionModel } from '../src/models/collection-model';
import { ImportMediaModel } from '../src/models/import-media-model';
import { startTestApp, makePng, type TestApp } from './helpers/test-app';
import { commit, content, makeImporter, payload, sessionPath, sha256, SOURCE_FINGERPRINT, startSession, upload } from './helpers/import-fixtures';

let testApp: TestApp;
let token: string;
beforeEach(async () => {
  testApp = await startTestApp();
  token = (await makeImporter(testApp)).token;
  await startSession(testApp, token).expect(200);
});
afterEach(async () => { await testApp.stop(); });

describe('desktop import media and sessions', () => {
  it('starts once, reconciles, and rejects a changed fingerprint under the same session ID', async () => {
    await startSession(testApp, token).expect(200);
    await supertest(testApp.app).put(sessionPath()).auth(token, { type: 'bearer' }).send({
      contractVersion: 'desktop-import.v1', sourceLabel: 'Ảnh mẫu', sourceFingerprint: 'b'.repeat(64),
    }).expect(409);
    const response = await supertest(testApp.app).get(sessionPath()).auth(token, { type: 'bearer' }).expect(200);
    expect(response.body).toMatchObject({ sourceFingerprint: SOURCE_FINGERPRINT, operations: [], media: [] });
  });

  it('stores server-generated media keys, returns the same receipt on retry, and prevents changed input', async () => {
    const png = await makePng(40, 60);
    const first = await upload(testApp, token, 'model-image', 'model', png);
    expect(first.status).toBe(200);
    expect(first.body.image.key).toMatch(/^public\/import\/[a-f0-9]{24}\/[a-f0-9]{24}-[a-f0-9]{64}\.webp$/);
    expect(first.body.image).toMatchObject({ width: 40, height: 60 });
    const second = await upload(testApp, token, 'model-image', 'model', png);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(testApp.s3Puts).toHaveLength(1);
    expect((await upload(testApp, token, 'model-image', 'item', png)).status).toBe(409);
    expect((await upload(testApp, token, 'model-image', 'model', await makePng(50, 60))).status).toBe(409);
    const list = await supertest(testApp.app).get(sessionPath()).auth(token, { type: 'bearer' }).expect(200);
    expect(list.body.media).toEqual([first.body]);
  });

  it('validates checksum, MIME, image bytes and request size before recording a usable receipt', async () => {
    const png = await makePng(40, 60);
    const path = `${sessionPath()}/media/bad?kind=model`;
    await supertest(testApp.app).put(path).auth(token, { type: 'bearer' }).set('X-Content-SHA256', '0'.repeat(64))
      .attach('file', png, { filename: 'test.png', contentType: 'image/png' }).expect(400);
    await supertest(testApp.app).put(path).auth(token, { type: 'bearer' }).set('X-Content-SHA256', sha256(png))
      .attach('file', png, { filename: 'test.jpg', contentType: 'image/jpeg' }).expect(400);
    const bad = Buffer.from('invalid image');
    await supertest(testApp.app).put(path).auth(token, { type: 'bearer' }).set('X-Content-SHA256', sha256(bad))
      .attach('file', bad, { filename: 'test.png', contentType: 'image/png' }).expect(400);
    const big = Buffer.alloc(11 * 1024 * 1024);
    await supertest(testApp.app).put(path).auth(token, { type: 'bearer' }).set('X-Content-SHA256', sha256(big))
      .attach('file', big, { filename: 'big.png', contentType: 'image/png' }).expect(413);
    expect(await ImportMediaModel.countDocuments()).toBe(0);
    expect(testApp.s3Puts).toHaveLength(0);
  });

  it('makes concurrent uploads converge on one receipt and one object write', async () => {
    const png = await makePng(100, 100);
    const responses = await Promise.all([upload(testApp, token, 'model-image', 'model', png), upload(testApp, token, 'model-image', 'model', png)]);
    expect(responses.map((response) => response.status).every((status) => status === 200 || status === 409)).toBe(true);
    expect(responses.some((response) => response.status === 200)).toBe(true);
    expect((await upload(testApp, token, 'model-image', 'model', png)).status).toBe(200);
    expect(await ImportMediaModel.countDocuments()).toBe(1);
    expect(testApp.s3Puts).toHaveLength(1);
  });

  it('retries a failed storage write with the same server-controlled object key', async () => {
    const put = testApp.ctx.storage.putObject;
    const attemptedKeys: string[] = [];
    testApp.ctx.storage.putObject = async (input) => { attemptedKeys.push(input.key); throw new Error('Simulated storage interruption'); };
    expect((await upload(testApp, token, 'model-image')).status).toBe(500);
    const failed = await ImportMediaModel.findOne().lean();
    expect(failed?.status).toBe('failed');
    testApp.ctx.storage.putObject = async (input) => { attemptedKeys.push(input.key); return put(input); };
    expect((await upload(testApp, token, 'model-image')).status).toBe(200);
    expect(attemptedKeys).toHaveLength(2);
    expect(attemptedKeys[0]).toBe(attemptedKeys[1]);
    expect(await ImportMediaModel.countDocuments()).toBe(1);
  });

  it('rejects foreign references and client-supplied storage keys without creating entities', async () => {
    const png = await makePng(40, 60);
    await upload(testApp, token, 'model-image', 'model', png);
    await upload(testApp, token, 'item-image', 'item', png);
    await startSession(testApp, token, 'session-other').expect(200);
    const foreign = payload(content());
    await supertest(testApp.app).put(`${sessionPath('session-other')}/operations/op`).auth(token, { type: 'bearer' }).send(foreign).expect(400);
    const body = { ...payload(), outfit: { ...content().outfit, modelImage: { key: 'public/forged.webp', width: 1, height: 1 } } };
    await supertest(testApp.app).put(`${sessionPath()}/operations/op`).auth(token, { type: 'bearer' }).send(body).expect(400);
    const publishAttempt = { ...payload(), outfit: { ...content().outfit, status: 'published', featured: true } };
    await supertest(testApp.app).put(`${sessionPath()}/operations/op`).auth(token, { type: 'bearer' }).send(publishAttempt).expect(400);
    expect(await OutfitModel.countDocuments()).toBe(0);
    expect(await CollectionModel.countDocuments()).toBe(0);
    const wrongKind = content();
    wrongKind.outfit.modelMediaId = 'item-image';
    await commit(testApp, token, payload(wrongKind)).expect(400);
  });
});
