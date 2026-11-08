import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PageLayoutModel } from '../src/models/page-layout-model';
import { adminApi, faqSection, saveDraftVia, type Agent } from './helpers/content-api';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Agent;
let api: ReturnType<typeof adminApi>;

beforeAll(async () => {
  testApp = await startTestApp();
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await PageLayoutModel.deleteMany({});
  testApp.revalidateHits.length = 0;
});

const saveAndPublish = async (title: string, base: string | null) => {
  const saved = await saveDraftVia(agent, [faqSection(`faq-${title}`, { title })], base);
  const draftUpdatedAt = saved.body.draftUpdatedAt as string;
  return { draftUpdatedAt, published: await api.post('/api/admin/home/publish', { baseUpdatedAt: draftUpdatedAt }) };
};

describe('publishing an unchanged draft', () => {
  it('is a no-op: same publishedAt, previous kept, no revalidation', async () => {
    const first = await saveAndPublish('v1', null);
    const second = await saveAndPublish('v2', first.draftUpdatedAt);
    expect(second.published.body.previous).toEqual({ publishedAt: first.published.body.publishedAt });
    testApp.revalidateHits.length = 0;

    const retry = await api.post('/api/admin/home/publish', { baseUpdatedAt: second.draftUpdatedAt });
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual(second.published.body);
    expect(testApp.revalidateHits).toHaveLength(0);
    const stored = await PageLayoutModel.findOne({ pageKey: 'home' }).lean();
    expect(stored?.previous?.publishedAt?.toISOString()).toBe(first.published.body.publishedAt);
  });

  it('still answers 409 when the draft base is stale', async () => {
    const first = await saveAndPublish('v1', null);
    await saveDraftVia(agent, [faqSection('faq-other', { title: 'other' })], first.draftUpdatedAt);
    const stale = await api.post('/api/admin/home/publish', { baseUpdatedAt: first.draftUpdatedAt });
    expect(stale.status).toBe(409);
  });

  it('still publishes the default layout the first time', async () => {
    const reset = await api.post('/api/admin/home/reset', {});
    const published = await api.post('/api/admin/home/publish', { baseUpdatedAt: reset.body.draftUpdatedAt });
    expect(published.status).toBe(200);
    expect(published.body.previous).toEqual({ publishedAt: null });
    expect((await PageLayoutModel.findOne({ pageKey: 'home' }).lean())?.published).not.toBeNull();
  });
});
