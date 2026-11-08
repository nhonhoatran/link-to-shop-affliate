import { HOME_LAYOUT_SCHEMA_VERSION, HOME_SECTION_DEFAULTS, type HomeSection } from '@under30ss/shared';
import supertest from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CollectionModel } from '../src/models/collection-model';
import { OutfitModel } from '../src/models/outfit-model';
import { PageLayoutModel } from '../src/models/page-layout-model';
import { SettingsModel } from '../src/models/settings-model';
import {
  adminApi,
  COVER,
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
const types = (home: { sections: { type: string }[] }) => home.sections.map((section) => section.type);
const slugsOf = (items: { slug: string }[]) => items.map((item) => item.slug);

beforeAll(async () => {
  testApp = await startTestApp({ PUBLIC_LOOKS_PAGE_SIZE: '3', PUBLIC_RELATED_OUTFITS_COUNT: '3', PUBLIC_PAGE_SIZE_MAX: '6' });
  agent = await loggedInAgent(testApp);
  api = adminApi(agent);
});

afterAll(async () => {
  await testApp.stop();
});

beforeEach(async () => {
  await Promise.all([PageLayoutModel.deleteMany({}), CollectionModel.deleteMany({}), OutfitModel.deleteMany({}), SettingsModel.deleteMany({})]);
});

const publishRaw = (content: unknown[]) =>
  PageLayoutModel.updateOne(
    { pageKey: 'home' },
    { $set: { draft: { content: [] }, published: { content }, publishedAt: new Date(), schemaVersion: HOME_LAYOUT_SCHEMA_VERSION } },
    { upsert: true },
  );

const saveConsent = (text: string) =>
  api.put('/api/admin/settings', { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '', newsletterConsent: { text } });

const gallerySection = (id: string, overrides: Partial<Extract<HomeSection, { type: 'Gallery' }>['props']> = {}): HomeSection => ({
  type: 'Gallery',
  props: { id, ...HOME_SECTION_DEFAULTS.Gallery, ...overrides },
});
const newsletterSection = (id: string): HomeSection => ({ type: 'NewsletterSignup', props: { id, ...HOME_SECTION_DEFAULTS.NewsletterSignup } });
const marqueeSection = (id: string, items = [{ text: 'Giao nhanh' }]): HomeSection => ({
  type: 'Marquee',
  props: { id, ...HOME_SECTION_DEFAULTS.Marquee, items },
});
const bannerSection = (id: string): HomeSection => ({
  type: 'CampaignBanner',
  props: { id, ...HOME_SECTION_DEFAULTS.CampaignBanner, heading: 'Mùa mới', image: COVER, alt: 'Banner' },
});

describe('public home: editorial sections', () => {
  it('resolves a layout with all 11 section types in order', async () => {
    await createOutfitVia(agent, 'main-look', { featured: true });
    for (const slug of ['one', 'two', 'three', 'four']) await createOutfitVia(agent, slug);
    await createCollectionVia(agent, { slug: 'fresh' });
    await saveConsent('Đồng ý nhận tin');
    await publishRaw([
      heroSection('a'),
      marqueeSection('b'),
      { type: 'TextWithImage', props: { id: 'c', ...HOME_SECTION_DEFAULTS.TextWithImage, heading: 'Về chúng tôi', body: 'Nội dung' } },
      collectionTilesSection('d'),
      featuredLookbookSection('e'),
      outfitListSection('f', { excludeFeatured: true }),
      bannerSection('g'),
      gallerySection('h'),
      faqSection('i'),
      {
        type: 'Commitments',
        props: {
          id: 'j',
          ...HOME_SECTION_DEFAULTS.Commitments,
          items: [
            { icon: 'truck', title: 'Giao nhanh', text: 'Trong 2 ngày' },
            { icon: 'heart', title: 'Tận tâm', text: 'Hỗ trợ mỗi ngày' },
          ],
        },
      },
      newsletterSection('k'),
    ]);

    const home = await publicHome();
    expect(types(home)).toEqual([
      'HeroSlider',
      'Marquee',
      'TextWithImage',
      'CollectionTiles',
      'FeaturedLookbook',
      'OutfitList',
      'CampaignBanner',
      'Gallery',
      'Faq',
      'Commitments',
      'NewsletterSignup',
    ]);
    const banner = home.sections[6];
    expect(banner.props.image.url).toBe(`http://cdn.test/media/${COVER.key}`);
    expect(home.sections[7].data.items.length).toBeGreaterThan(0);
    expect(home.sections[10].data.consent).toMatchObject({ text: 'Đồng ý nhận tin', version: 1, privacyLabel: 'Chính sách bảo mật' });
  });

  it('drops a marquee without items and a gallery without outfits', async () => {
    await publishRaw([marqueeSection('m', []), gallerySection('g'), gallerySection('g2', { source: 'manual' })]);
    expect((await publicHome()).sections).toEqual([]);
  });

  it('serves a gallery from a published collection and ignores a draft one', async () => {
    const collection = await createCollectionVia(agent, { slug: 'fresh' });
    const draft = await createCollectionVia(agent, { slug: 'hidden', status: 'draft' });
    await createOutfitVia(agent, 'in-collection', { collectionIds: [collection.id] });
    await createOutfitVia(agent, 'in-draft', { collectionIds: [draft.id] });
    await createOutfitVia(agent, 'elsewhere');
    await publishRaw([
      gallerySection('a', { source: 'collection', collectionIds: [collection.id] }),
      gallerySection('b', { source: 'collection', collectionIds: [draft.id] }),
    ]);
    const home = await publicHome();
    expect(home.sections).toHaveLength(1);
    expect(slugsOf(home.sections[0].data.items)).toEqual(['in-collection']);
  });

  it('serves a manual gallery in the picked order and skips unpublished outfits', async () => {
    const first = await createOutfitVia(agent, 'first');
    const second = await createOutfitVia(agent, 'second');
    const draft = await createOutfitVia(agent, 'draft-one', { status: 'draft' });
    await publishRaw([gallerySection('a', { source: 'manual', outfitIds: [second.id, draft.id, first.id], count: 5 })]);
    expect(slugsOf((await publicHome()).sections[0].data.items)).toEqual(['second', 'first']);
  });

  it('caps the gallery at its count', async () => {
    for (const slug of ['a', 'b', 'c', 'd']) await createOutfitVia(agent, slug);
    await publishRaw([gallerySection('g', { count: 2 })]);
    expect((await publicHome()).sections[0].data.items).toHaveLength(2);
  });

  it('keeps a latest gallery clear of outfits an outfit list on the same page already shows', async () => {
    for (const slug of ['one', 'two', 'three', 'four', 'five']) await createOutfitVia(agent, slug);
    await publishRaw([outfitListSection('list', { count: 3 }), gallerySection('g', { count: 2 })]);
    const home = await publicHome();
    const listed = slugsOf(home.sections[0].data.tabs[0].items);
    const galleried = slugsOf(home.sections[1].data.items);
    expect(listed).toHaveLength(3);
    expect(galleried).toHaveLength(2);
    expect(galleried.filter((slug) => listed.includes(slug))).toEqual([]);
  });

  it('keeps a latest gallery clear of the featured lookbook outfit', async () => {
    for (const slug of ['main-look', 'one', 'two']) await createOutfitVia(agent, slug, slug === 'main-look' ? { featured: true } : {});
    await publishRaw([featuredLookbookSection('fl'), gallerySection('g', { count: 3 })]);
    const home = await publicHome();
    expect(home.sections[0].data.outfit.slug).toBe('main-look');
    expect(slugsOf(home.sections[1].data.items)).not.toContain('main-look');
  });

  it('keeps the section order when a latest gallery is resolved in the second pass', async () => {
    for (const slug of ['one', 'two', 'three', 'four']) await createOutfitVia(agent, slug);
    await publishRaw([gallerySection('g'), faqSection('f'), outfitListSection('l')]);
    expect(types(await publicHome())).toEqual(['Gallery', 'Faq', 'OutfitList']);
  });

  it('hides the signup form until an admin saves a consent sentence, on a published layout', async () => {
    await publishRaw([newsletterSection('n'), faqSection('f')]);
    expect(types(await publicHome())).toEqual(['Faq']);
    await saveConsent('Đồng ý');
    expect(types(await publicHome())).toEqual(['NewsletterSignup', 'Faq']);
  });

  it('hides the signup form on the built-in layout until a sentence is saved', async () => {
    await createOutfitVia(agent, 'only');
    const before = await publicHome();
    expect(before.source).toBe('default');
    expect(types(before)).not.toContain('NewsletterSignup');
    await saveConsent('Đồng ý');
    expect(types(await publicHome())).toContain('NewsletterSignup');
  });

  it('does not repeat outfits between the built-in outfit list and gallery', async () => {
    for (const slug of ['main-look', 'one', 'two', 'three', 'four', 'five', 'six']) {
      await createOutfitVia(agent, slug, slug === 'main-look' ? { featured: true } : {});
    }
    const home = await publicHome();
    const list = home.sections.find((section: { type: string }) => section.type === 'OutfitList');
    const gallery = home.sections.find((section: { type: string }) => section.type === 'Gallery');
    expect(list).toBeDefined();
    expect(gallery).toBeDefined();
    const listed = slugsOf(list.data.tabs[0].items);
    expect(slugsOf(gallery.data.items).filter((slug) => listed.includes(slug))).toEqual([]);
  });

  it('serves the new version after the sentence changes', async () => {
    await saveConsent('Câu một');
    await publishRaw([newsletterSection('n')]);
    expect((await publicHome()).sections[0].data.consent.version).toBe(1);
    await saveConsent('Câu hai');
    expect((await publicHome()).sections[0].data.consent).toMatchObject({ text: 'Câu hai', version: 2 });
  });
});
