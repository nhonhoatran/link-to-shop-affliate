import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OutfitModel } from '../src/models/outfit-model';
import { buildOutfitPayload } from './helpers/outfit-payloads';
import { TEST_ORIGIN, loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Awaited<ReturnType<typeof loggedInAgent>>;

beforeAll(async () => {
  testApp = await startTestApp();
  agent = await loggedInAgent(testApp);
});
afterAll(async () => { await testApp.stop(); });
beforeEach(async () => { await OutfitModel.deleteMany({}); });

const create = (body: object) => agent.post('/api/admin/outfits').set('Origin', TEST_ORIGIN).send(body);
const update = (id: string, body: object) => agent.put('/api/admin/outfits/' + id).set('Origin', TEST_ORIGIN).send(body);

describe('outfit display options', () => {
  it('defaults new and legacy outfits to no arrows in admin and public responses', async () => {
    const created = await create(buildOutfitPayload({ status: 'published' }));
    expect(created.status).toBe(201);
    expect(created.body.showArrows).toBe(false);
    expect((await agent.get('/api/public/outfits/sample-look')).body.showArrows).toBe(false);

    await OutfitModel.collection.updateOne({ slug: 'sample-look' }, { $unset: { showArrows: '' } });
    expect((await agent.get('/api/admin/outfits/' + created.body.id)).body.showArrows).toBe(false);
    expect((await agent.get('/api/public/outfits/sample-look')).body.showArrows).toBe(false);
  });

  it('persists enabling and disabling arrows and keeps the option for a legacy PUT', async () => {
    const payload = buildOutfitPayload({ status: 'published' });
    const created = await create({ ...payload, showArrows: true });
    expect(created.body.showArrows).toBe(true);
    expect((await agent.get('/api/public/outfits/sample-look')).body.showArrows).toBe(true);

    expect((await update(created.body.id, payload)).body.showArrows).toBe(true);
    const disabled = await update(created.body.id, { ...payload, showArrows: false });
    expect(disabled.status).toBe(200);
    expect(disabled.body.showArrows).toBe(false);
    expect((await agent.get('/api/public/outfits/sample-look')).body.showArrows).toBe(false);
  });

  it('removes an existing link while publishing and still rejects invalid links and missing anchors', async () => {
    const payload = buildOutfitPayload();
    const created = await create(payload);
    payload.items[0]!.affiliateUrl = '';
    const published = await update(created.body.id, { ...payload, status: 'published' });
    expect(published.status).toBe(200);
    expect(published.body.items[0].affiliateUrl).toBe('');

    payload.items[0]!.affiliateUrl = 'javascript:alert(1)';
    expect((await update(created.body.id, { ...payload, status: 'published' })).status).toBe(400);
    payload.items[0]!.affiliateUrl = '';
    delete payload.items[0]!.anchor;
    const noAnchor = await update(created.body.id, { ...payload, status: 'published' });
    expect(noAnchor.status).toBe(400);
    expect(noAnchor.body.error.fields).toHaveProperty(['items.0.anchor']);
  });
});
