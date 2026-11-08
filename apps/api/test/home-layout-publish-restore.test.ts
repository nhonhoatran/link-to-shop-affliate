import supertest from 'supertest';
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

const publicHome = async () => (await supertest(testApp.app).get('/api/public/home')).body;
const faqTitle = (home: { sections: { props: { title: string } }[] }) => home.sections[0]?.props.title;

/** Saves a draft titled `title` and publishes it; returns the new lock values. */
const saveAndPublish = async (title: string, base: string | null) => {
  const saved = await saveDraftVia(agent, [faqSection(`faq-${title}`, { title })], base);
  const published = await api.post('/api/admin/home/publish', { baseUpdatedAt: saved.body.draftUpdatedAt });
  return { draftUpdatedAt: saved.body.draftUpdatedAt as string, published };
};

const lastHit = () => testApp.revalidateHits.at(-1);

describe('home publish and restore', () => {
  it('answers 409 NO_PREVIOUS when nothing was ever published', async () => {
    const response = await api.post('/api/admin/home/restore-previous', { basePublishedAt: null });
    expect(response.status).toBe(409);
    expect(response.body.error.fields).toEqual({ previous: 'NO_PREVIOUS' });
    expect(response.body.error.message).toMatch(/hoàn tác/);
  });

  it('requires the basePublishedAt key', async () => {
    expect((await api.post('/api/admin/home/restore-previous', {})).status).toBe(400);
  });

  it('keeps the default layout as the previous version of the first publish', async () => {
    const { published } = await saveAndPublish('v1', null);
    expect(published.status).toBe(200);
    expect(published.body.previous).toEqual({ publishedAt: null });
    expect(faqTitle(await publicHome())).toBe('v1');
    expect((await publicHome()).source).toBe('published');

    const restored = await api.post('/api/admin/home/restore-previous', { basePublishedAt: published.body.publishedAt });
    expect(restored.status).toBe(200);
    expect(restored.body.publishedAt).toBeNull();
    expect(restored.body.previous).toEqual({ publishedAt: published.body.publishedAt });
    expect((await publicHome()).source).toBe('default');
  });

  it('restores version 1 after publishing version 2 and leaves the draft alone', async () => {
    const v1 = await saveAndPublish('v1', null);
    const v2 = await saveAndPublish('v2', v1.draftUpdatedAt);
    expect(v2.published.body.previous).toEqual({ publishedAt: v1.published.body.publishedAt });
    expect(faqTitle(await publicHome())).toBe('v2');

    const restored = await api.post('/api/admin/home/restore-previous', { basePublishedAt: v2.published.body.publishedAt });
    expect(restored.body.publishedAt).toBe(v1.published.body.publishedAt);
    expect(faqTitle(await publicHome())).toBe('v1');

    const admin = (await api.get('/api/admin/home')).body;
    expect(admin.draft[0].props.title).toBe('v2');
    expect(admin.draftUpdatedAt).toBe(v2.draftUpdatedAt);
    expect(admin.hasUnpublishedChanges).toBe(true);
  });

  it('undoes the undo: a second restore returns to version 2', async () => {
    const v1 = await saveAndPublish('v1', null);
    const v2 = await saveAndPublish('v2', v1.draftUpdatedAt);
    const first = await api.post('/api/admin/home/restore-previous', { basePublishedAt: v2.published.body.publishedAt });
    const second = await api.post('/api/admin/home/restore-previous', { basePublishedAt: first.body.publishedAt });
    expect(second.status).toBe(200);
    expect(second.body.publishedAt).toBe(v2.published.body.publishedAt);
    expect(faqTitle(await publicHome())).toBe('v2');
  });

  it('answers 409 for a stale basePublishedAt without changing anything', async () => {
    const v1 = await saveAndPublish('v1', null);
    const v2 = await saveAndPublish('v2', v1.draftUpdatedAt);
    const stale = await api.post('/api/admin/home/restore-previous', { basePublishedAt: v1.published.body.publishedAt });
    expect(stale.status).toBe(409);
    expect(stale.body.error.fields).toBeUndefined();
    expect(faqTitle(await publicHome())).toBe('v2');
    expect(v2.published.status).toBe(200);
  });

  it('answers 409 when publishing with a stale baseUpdatedAt', async () => {
    const saved = await saveDraftVia(agent, [faqSection('x')], null);
    await saveDraftVia(agent, [faqSection('y')], saved.body.draftUpdatedAt);
    const stale = await api.post('/api/admin/home/publish', { baseUpdatedAt: saved.body.draftUpdatedAt });
    expect(stale.status).toBe(409);
    expect((await publicHome()).source).toBe('default');
  });

  it('publishes the untouched default layout when no draft was ever saved', async () => {
    const published = await api.post('/api/admin/home/publish', { baseUpdatedAt: null });
    expect(published.status).toBe(200);
    expect((await publicHome()).source).toBe('published');
  });
});

describe('home reset', () => {
  it('discards the draft, serves the default and stays restorable', async () => {
    const v1 = await saveAndPublish('v1', null);
    const reset = await api.post('/api/admin/home/reset');
    expect(reset.status).toBe(200);
    expect(reset.body).toMatchObject({ usingDefault: true, publishedAt: null, hasUnpublishedChanges: false });
    expect(reset.body.previous).toEqual({ publishedAt: v1.published.body.publishedAt });
    expect((await publicHome()).source).toBe('default');

    const restored = await api.post('/api/admin/home/restore-previous', { basePublishedAt: null });
    expect(restored.status).toBe(200);
    expect(faqTitle(await publicHome())).toBe('v1');
  });

  it('keeps an existing previous version when reset runs on the default layout', async () => {
    const v1 = await saveAndPublish('v1', null);
    await api.post('/api/admin/home/reset');
    const again = await api.post('/api/admin/home/reset');
    expect(again.body.previous).toEqual({ publishedAt: v1.published.body.publishedAt });
  });
});

describe('home revalidation', () => {
  it('refreshes the home page and its tag on publish, restore and reset only', async () => {
    const v1 = await saveAndPublish('v1', null);
    expect(lastHit()).toMatchObject({ paths: ['/'], tags: ['public-home'] });

    testApp.revalidateHits.length = 0;
    await saveDraftVia(agent, [faqSection('again')], v1.draftUpdatedAt);
    await api.post('/api/admin/home/revert-draft');
    await api.post('/api/admin/home/preview', { content: [] });
    expect(testApp.revalidateHits).toHaveLength(0);

    await api.post('/api/admin/home/restore-previous', { basePublishedAt: v1.published.body.publishedAt });
    expect(lastHit()).toMatchObject({ paths: ['/'], tags: ['public-home'] });
    testApp.revalidateHits.length = 0;
    await api.post('/api/admin/home/reset');
    expect(testApp.revalidateHits).toHaveLength(1);
    expect(lastHit()).toMatchObject({ paths: ['/'], tags: ['public-home'] });
  });
});
