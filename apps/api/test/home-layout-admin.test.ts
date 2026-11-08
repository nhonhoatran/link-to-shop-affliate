import { DEFAULT_HOME_CONTENT, type HomeSection } from '@under30ss/shared';
import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { OutfitModel } from '../src/models/outfit-model';
import { PageLayoutModel } from '../src/models/page-layout-model';
import {
  adminApi,
  collectionTilesSection,
  faqSection,
  heroSection,
  outfitListSection,
  saveDraftVia,
  type Agent,
} from './helpers/content-api';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Agent;
let api: ReturnType<typeof adminApi>;

beforeAll(async () => {
  testApp = await startTestApp({ PUBLIC_LOOKS_PAGE_SIZE: '10', PUBLIC_PAGE_SIZE_MAX: '10' });
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await Promise.all([PageLayoutModel.deleteMany({}), CollectionModel.deleteMany({}), OutfitModel.deleteMany({})]);
  testApp.revalidateHits.length = 0;
});

describe('admin home: access', () => {
  it('rejects every home route without a session', async () => {
    const anonymous = supertest(testApp.app);
    const origin = { Origin: 'http://localhost:8080' };
    expect((await anonymous.get('/api/admin/home')).status).toBe(401);
    expect((await anonymous.get('/api/admin/home/preview')).status).toBe(401);
    for (const path of ['preview', 'publish', 'restore-previous', 'revert-draft', 'reset']) {
      expect((await anonymous.post(`/api/admin/home/${path}`).set(origin).send({})).status).toBe(401);
    }
    expect((await anonymous.put('/api/admin/home/draft').set(origin).send({})).status).toBe(401);
  });
});

describe('admin home: draft', () => {
  it('serves the default layout as the draft before anything is saved', async () => {
    const response = await api.get('/api/admin/home');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      draftUpdatedAt: null,
      publishedAt: null,
      previous: null,
      usingDefault: true,
      hasUnpublishedChanges: false,
    });
    expect(response.body.draft.map((section: { type: string }) => section.type)).toEqual(
      DEFAULT_HOME_CONTENT.map((section) => section.type),
    );
  });

  it('saves a draft, reads it back and flags unpublished changes without revalidating', async () => {
    const saved = await saveDraftVia(agent, [faqSection('faq-1')], null);
    expect(saved.status).toBe(200);
    expect(saved.body.draftUpdatedAt).toEqual(expect.any(String));
    expect(saved.body.hasUnpublishedChanges).toBe(true);

    const read = await api.get('/api/admin/home');
    expect(read.body.draft).toHaveLength(1);
    expect(read.body.draft[0].props.id).toBe('faq-1');
    expect(read.body.draftUpdatedAt).toBe(saved.body.draftUpdatedAt);
    expect(testApp.revalidateHits).toHaveLength(0);
  });

  it('answers 409 for a stale baseUpdatedAt, including a second save with the same base', async () => {
    const first = await saveDraftVia(agent, [faqSection('a')], null);
    expect((await saveDraftVia(agent, [faqSection('b')], first.body.draftUpdatedAt)).status).toBe(200);
    const stale = await saveDraftVia(agent, [faqSection('c')], first.body.draftUpdatedAt);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('CONFLICT');
    expect((await saveDraftVia(agent, [faqSection('d')], null)).status).toBe(409);
    expect((await api.get('/api/admin/home')).body.draft[0].props.id).toBe('b');
  });

  it('rejects an unsafe link with the field path of the section', async () => {
    const unsafe = faqSection('faq-x');
    const content = [
      unsafe,
      { type: 'TextWithImage', props: { id: 't', visible: true, heading: 'Hi', body: 'Body', imagePosition: 'left', ctaLabel: 'Go', ctaHref: 'javascript:alert(1)' } },
    ];
    const response = await api.put('/api/admin/home/draft', { content, baseUpdatedAt: null });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(response.body.error.fields)).toEqual(['content.1.props.ctaHref']);
  });

  it('rejects a count above the ceiling and image keys outside the public prefix', async () => {
    const tooMany = await saveDraftVia(
      agent,
      [faqSection('f'), outfitListSection('list', { count: 11 }), collectionTilesSection('tiles', { count: 99 })],
      null,
    );
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error.fields).toMatchObject({
      'content.1.props.count': 'Tối đa 10',
      'content.2.props.count': 'Tối đa 10',
    });

    const privateKey = await saveDraftVia(agent, [heroSection('hero', 'private/banner.webp')], null);
    expect(privateKey.status).toBe(400);
    expect(privateKey.body.error.fields).toHaveProperty(['content.0.props.slides.0.image.key']);
  });

  it('strips client supplied urls before storing and attaches them when reading', async () => {
    await saveDraftVia(agent, [heroSection('hero')], null);
    const stored = await PageLayoutModel.findOne({ pageKey: 'home' }).lean();
    expect(JSON.stringify(stored?.draft)).not.toContain('client-supplied');
    const read = await api.get('/api/admin/home');
    expect(read.body.draft[0].props.slides[0].image.url).toBe('http://cdn.test/media/public/model/2026/11/cover.webp');
  });

  it('drops unknown keys and answers 400 for an unknown section type', async () => {
    const withExtra = { ...faqSection('extra'), props: { ...faqSection('extra').props, evil: '<script>' } };
    const saved = await saveDraftVia(agent, [withExtra as unknown as HomeSection], null);
    expect(saved.status).toBe(200);
    expect(saved.body.draft[0].props).not.toHaveProperty('evil');
    const unknown = await api.put('/api/admin/home/draft', { content: [{ type: 'Nope', props: { id: 'n' } }], baseUpdatedAt: null });
    expect(unknown.status).toBe(400);
  });

  it('reverts the draft to the published layout, or the default when nothing is published', async () => {
    const saved = await saveDraftVia(agent, [faqSection('edited')], null);
    const reverted = await api.post('/api/admin/home/revert-draft');
    expect(reverted.status).toBe(200);
    expect(reverted.body.draft).toHaveLength(DEFAULT_HOME_CONTENT.length);
    expect(reverted.body.hasUnpublishedChanges).toBe(false);
    expect(reverted.body.draftUpdatedAt).not.toBe(saved.body.draftUpdatedAt);

    const next = await saveDraftVia(agent, [faqSection('live')], reverted.body.draftUpdatedAt);
    await api.post('/api/admin/home/publish', { baseUpdatedAt: next.body.draftUpdatedAt });
    await saveDraftVia(agent, [faqSection('wip')], next.body.draftUpdatedAt);
    const back = await api.post('/api/admin/home/revert-draft');
    expect(back.body.draft[0].props.id).toBe('live');
    expect(testApp.revalidateHits.filter((hit) => hit.paths.length === 0)).toHaveLength(0);
  });
});

describe('admin home: preview', () => {
  it('resolves the posted content without saving it', async () => {
    const response = await api.post('/api/admin/home/preview', { content: [faqSection('p'), heroSection('h')] });
    expect(response.status).toBe(200);
    expect(response.body.sections.map((section: { type: string }) => section.type)).toEqual(['Faq', 'HeroSlider']);
    expect(response.body.sections[1].props.slides[0].image.url).toContain('http://cdn.test/media/');
    expect(await PageLayoutModel.countDocuments()).toBe(0);
    expect(testApp.revalidateHits).toHaveLength(0);
  });

  it('validates posted content like a draft save', async () => {
    const response = await api.post('/api/admin/home/preview', { content: [outfitListSection('l', { count: 11 })] });
    expect(response.status).toBe(400);
    expect(response.body.error.fields).toHaveProperty(['content.0.props.count']);
  });

  it('resolves the saved draft on GET', async () => {
    await saveDraftVia(agent, [faqSection('saved-draft', { title: 'Draft only' })], null);
    const response = await api.get('/api/admin/home/preview');
    expect(response.status).toBe(200);
    expect(response.body.sections[0].props.title).toBe('Draft only');
  });
});
