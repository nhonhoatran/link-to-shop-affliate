import { HOME_LAYOUT_SCHEMA_VERSION } from '@under30ss/shared';
import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { OutfitModel } from '../src/models/outfit-model';
import { PageLayoutModel } from '../src/models/page-layout-model';
import {
  adminApi,
  collectionTilesSection,
  createCollectionVia,
  createOutfitVia,
  faqSection,
  featuredLookbookSection,
  heroSection,
  outfitListSection,
  type Agent,
} from './helpers/content-api';
import { loggedInAgent, startTestApp, type TestApp } from './helpers/test-app';

let testApp: TestApp;
let agent: Agent;
let api: ReturnType<typeof adminApi>;
const publicHome = async () => (await supertest(testApp.app).get('/api/public/home')).body;
const slugsOf = (items: { slug: string }[]) => items.map((item) => item.slug);

beforeAll(async () => {
  testApp = await startTestApp({ PUBLIC_LOOKS_PAGE_SIZE: '3', PUBLIC_RELATED_OUTFITS_COUNT: '3', PUBLIC_PAGE_SIZE_MAX: '4' });
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await Promise.all([PageLayoutModel.deleteMany({}), CollectionModel.deleteMany({}), OutfitModel.deleteMany({})]);
});

/** Writes straight to the published slot, the way a publish would. */
const publishRaw = (content: unknown[]) =>
  PageLayoutModel.updateOne(
    { pageKey: 'home' },
    { $set: { draft: { content: [] }, published: { content }, publishedAt: new Date(), schemaVersion: HOME_LAYOUT_SCHEMA_VERSION } },
    { upsert: true },
  );

describe('public home: default layout', () => {
  it('answers with source default and no sections on an empty database', async () => {
    const response = await supertest(testApp.app).get('/api/public/home');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ source: 'default', sections: [] });
  });

  it('shows the featured lookbook and the other outfits without the featured one', async () => {
    await createOutfitVia(agent, 'main-look', { featured: true });
    for (const slug of ['one', 'two', 'three', 'four']) await createOutfitVia(agent, slug);

    const home = await publicHome();
    expect(home.source).toBe('default');
    expect(home.sections.map((section: { type: string }) => section.type)).toEqual(['FeaturedLookbook', 'OutfitList', 'Gallery']);
    expect(home.sections[0].data.outfit.slug).toBe('main-look');
    const slugs = slugsOf(home.sections[1].data.tabs[0].items);
    expect(slugs).toHaveLength(3);
    expect(slugs).not.toContain('main-look');
    expect(home.sections[1].data.tabs[0]).toMatchObject({ key: 'latest', href: '/looks' });
  });

  it('adds the collection tiles as soon as a collection is published', async () => {
    await createOutfitVia(agent, 'only');
    await createCollectionVia(agent, { slug: 'fresh' });
    const home = await publicHome();
    const tiles = home.sections.find((section: { type: string }) => section.type === 'CollectionTiles');
    expect(slugsOf(tiles.data.items)).toEqual(['fresh']);
  });
});

describe('public home: published layout', () => {
  it('never exposes the draft', async () => {
    await api.put('/api/admin/home/draft', { content: [faqSection('draft-only')], baseUpdatedAt: null });
    expect((await publicHome()).source).toBe('default');
  });

  it('drops hidden sections and sections with nothing to show', async () => {
    const hidden = faqSection('hidden');
    await publishRaw([
      { ...hidden, props: { ...hidden.props, visible: false } },
      outfitListSection('empty-list'),
      collectionTilesSection('empty-tiles'),
      featuredLookbookSection('no-featured'),
      faqSection('visible-faq'),
    ]);
    const home = await publicHome();
    expect(home.source).toBe('published');
    expect(home.sections.map((section: { props: { id: string } }) => section.props.id)).toEqual(['visible-faq']);
  });

  it('keeps the order of a hand-picked outfit list and skips drafts and deleted outfits', async () => {
    const a = await createOutfitVia(agent, 'pick-a');
    const b = await createOutfitVia(agent, 'pick-b');
    const c = await createOutfitVia(agent, 'pick-c');
    const draft = await createOutfitVia(agent, 'pick-draft', { status: 'draft' });
    const gone = await createOutfitVia(agent, 'pick-gone');
    await api.del(`/api/admin/outfits/${gone.id}`);
    await publishRaw([outfitListSection('manual', { source: 'manual', outfitIds: [c.id, draft.id, gone.id, a.id, b.id] })]);

    const home = await publicHome();
    expect(slugsOf(home.sections[0].data.tabs[0].items)).toEqual(['pick-c', 'pick-a', 'pick-b']);
  });

  it('applies excludeFeatured and clamps count to the ceiling', async () => {
    await createOutfitVia(agent, 'star', { featured: true });
    for (const slug of ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']) await createOutfitVia(agent, slug);
    await publishRaw([
      outfitListSection('keep', { count: 3 }),
      outfitListSection('exclude', { count: 3, excludeFeatured: true }),
      outfitListSection('huge', { count: 999 }),
    ]);
    const [keep, exclude, huge] = (await publicHome()).sections;
    expect(keep.data.tabs[0].items).toHaveLength(3);
    expect(slugsOf(exclude.data.tabs[0].items)).toHaveLength(3);
    expect(slugsOf(exclude.data.tabs[0].items)).not.toContain('star');
    expect(huge.data.tabs[0].items).toHaveLength(testApp.env.PUBLIC_PAGE_SIZE_MAX);
  });

  it('falls back to the relatedOutfitsCount setting when count is empty', async () => {
    for (const slug of ['s1', 's2', 's3', 's4']) await createOutfitVia(agent, slug);
    await publishRaw([outfitListSection('default-count')]);
    expect((await publicHome()).sections[0].data.tabs[0].items).toHaveLength(testApp.env.PUBLIC_RELATED_OUTFITS_COUNT);
  });

  it('builds one tab per collection with its name and link, skipping deleted collections', async () => {
    const summer = await createCollectionVia(agent, { slug: 'summer', name: 'Summer' });
    const winter = await createCollectionVia(agent, { slug: 'winter', name: 'Winter' });
    const gone = await createCollectionVia(agent, { slug: 'gone' });
    const inSummer = await createOutfitVia(agent, 'in-summer', { collectionIds: [summer.id] });
    await createOutfitVia(agent, 'in-winter', { collectionIds: [winter.id] });
    await createOutfitVia(agent, 'in-nothing');
    await api.del(`/api/admin/collections/${gone.id}`);
    await publishRaw([outfitListSection('tabs', { source: 'collection', collectionIds: [winter.id, gone.id, summer.id] })]);

    const { tabs } = (await publicHome()).sections[0].data;
    expect(tabs.map((tab: { label: string; href: string }) => [tab.label, tab.href])).toEqual([
      ['Winter', '/collections/winter'],
      ['Summer', '/collections/summer'],
    ]);
    expect(tabs[1].key).toBe(summer.id);
    expect(slugsOf(tabs[1].items)).toEqual([inSummer.slug]);
    const manual = await (async () => {
      await publishRaw([outfitListSection('m', { source: 'manual', outfitIds: [inSummer.id] })]);
      return (await publicHome()).sections[0].data.tabs[0];
    })();
    expect(manual).not.toHaveProperty('href');
  });

  it('resolves collection tiles in auto and manual mode, in the chosen order', async () => {
    const a = await createCollectionVia(agent, { slug: 'a' });
    const b = await createCollectionVia(agent, { slug: 'b' });
    await createCollectionVia(agent, { slug: 'c', status: 'draft', coverImage: undefined });
    await publishRaw([
      collectionTilesSection('auto', { mode: 'auto', count: 1 }),
      collectionTilesSection('manual', { mode: 'manual', collectionIds: [b.id, a.id, '64b7f0c2a1b2c3d4e5f60801'] }),
    ]);
    const [auto, manual] = (await publicHome()).sections;
    expect(slugsOf(auto.data.items)).toEqual(['a']);
    expect(slugsOf(manual.data.items)).toEqual(['b', 'a']);
  });

  it('resolves a manual lookbook, hides a draft one, and attaches image urls to the hero', async () => {
    const live = await createOutfitVia(agent, 'live-look');
    const draft = await createOutfitVia(agent, 'draft-look', { status: 'draft' });
    await publishRaw([
      featuredLookbookSection('live', { source: 'manual', outfitId: live.id }),
      featuredLookbookSection('draft', { source: 'manual', outfitId: draft.id }),
      heroSection('hero'),
    ]);
    const { sections } = await publicHome();
    expect(sections.map((section: { props: { id: string } }) => section.props.id)).toEqual(['live', 'hero']);
    expect(sections[0].data.outfit.slug).toBe('live-look');
    expect(sections[1].props.slides[0].image.url).toBe('http://cdn.test/media/public/model/2026/11/cover.webp');
  });

  it('skips a corrupt stored section and still renders the rest', async () => {
    await publishRaw([{ type: 'Nope', props: { id: 'broken' } }, { type: 'Faq', props: { id: 'bad-faq' } }, faqSection('good')]);
    const home = await publicHome();
    expect(home.sections.map((section: { props: { id: string } }) => section.props.id)).toEqual(['good']);
  });
});

describe('public home: response time', () => {
  it('answers a 12 section layout quickly', async () => {
    const collection = await createCollectionVia(agent, { slug: 'perf' });
    for (const slug of ['p1', 'p2', 'p3']) await createOutfitVia(agent, slug, { collectionIds: [collection.id] });
    await createOutfitVia(agent, 'perf-star', { featured: true });
    await publishRaw([
      heroSection('h'),
      featuredLookbookSection('f'),
      collectionTilesSection('t'),
      outfitListSection('l1'),
      outfitListSection('l2', { source: 'collection', collectionIds: [collection.id] }),
      ...Array.from({ length: 7 }, (_unused, index) => faqSection(`faq-${index}`)),
    ]);
    await publicHome();
    const started = performance.now();
    const response = await supertest(testApp.app).get('/api/public/home');
    const elapsedMs = performance.now() - started;
    console.info(`[perf] GET /api/public/home with 12 sections: ${elapsedMs.toFixed(1)} ms`);
    expect(response.body.sections).toHaveLength(12);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
