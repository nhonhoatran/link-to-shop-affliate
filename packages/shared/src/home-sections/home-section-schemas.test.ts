import { describe, expect, it } from 'vitest';
import {
  sampleEditorialHomeSections,
  sampleHomeSections,
  sampleResolvedEditorialSections,
  sampleResolvedHomeSections,
} from '../fixtures';
import {
  publishHomeRequestSchema,
  restorePreviousHomeRequestSchema,
  saveHomeDraftRequestSchema,
} from '../home-layout-contract';
import {
  DEFAULT_HOME_CONTENT,
  HOME_SECTION_DEFAULTS,
  HOME_SECTION_META,
  HOME_SECTION_TYPES,
  homeLayoutContentSchema,
  homeSectionSchema,
  MAX_HOME_SECTIONS,
} from './index';

const ID = '64b7f0c2a1b2c3d4e5f60701';
const image = { key: 'public/a.webp', width: 10, height: 10 };

const sampleResolvedAll = [...sampleResolvedHomeSections, ...sampleResolvedEditorialSections];
const allSamples = [...sampleHomeSections, ...sampleEditorialHomeSections];

const sampleOf = (type: string) => {
  const found = allSamples.find((section) => section.type === type);
  if (!found) throw new Error(`no sample for ${type}`);
  return structuredClone(found) as { type: string; props: Record<string, unknown> };
};

const withProps = (type: string, props: Record<string, unknown>) => {
  const section = sampleOf(type);
  return { ...section, props: { ...section.props, ...props } };
};

const firstIssuePath = (input: unknown) => {
  const result = homeSectionSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.path.join('.');
};

describe('default content and registry', () => {
  it('parses the default home content and the samples', () => {
    expect(homeLayoutContentSchema.safeParse(DEFAULT_HOME_CONTENT).success).toBe(true);
    expect(homeLayoutContentSchema.safeParse(sampleHomeSections).success).toBe(true);
    expect(homeLayoutContentSchema.safeParse(sampleEditorialHomeSections).success).toBe(true);
    expect(allSamples.map((section) => section.type)).toEqual([...HOME_SECTION_TYPES]);
  });

  it('leaves the default outfit list count unset so the setting decides', () => {
    const list = DEFAULT_HOME_CONTENT.find((section) => section.type === 'OutfitList');
    expect(list && 'count' in list.props).toBe(false);
  });

  it('has defaults and meta for every type', () => {
    for (const type of HOME_SECTION_TYPES) {
      expect(HOME_SECTION_DEFAULTS[type].visible).toBe(true);
      expect(HOME_SECTION_META[type].label.length).toBeGreaterThan(0);
    }
  });

  it('flags which types resolve data and show an image', () => {
    expect(HOME_SECTION_TYPES.filter((type) => HOME_SECTION_META[type].resolvesData)).toEqual([
      'CollectionTiles',
      'OutfitList',
      'FeaturedLookbook',
      'Gallery',
      'NewsletterSignup',
    ]);
    expect(HOME_SECTION_TYPES.filter((type) => !HOME_SECTION_META[type].hasImage)).toEqual([
      'Faq',
      'Commitments',
      'Marquee',
      'NewsletterSignup',
    ]);
  });

  it('keeps resolvesData in step with the resolved sections that carry data', () => {
    const withData = sampleResolvedAll.filter((section) => 'data' in section).map((section) => section.type);
    const flagged = HOME_SECTION_TYPES.filter((type) => HOME_SECTION_META[type].resolvesData);
    expect([...withData].sort()).toEqual([...flagged].sort());
  });

  it('parses the default content and layouts saved before eyebrows existed', () => {
    expect(JSON.stringify(sampleHomeSections)).not.toContain('eyebrow');
    expect(homeLayoutContentSchema.safeParse(sampleHomeSections).success).toBe(true);
    expect(DEFAULT_HOME_CONTENT.map((section) => section.type)).toEqual([
      'FeaturedLookbook',
      'CollectionTiles',
      'OutfitList',
      'Gallery',
      'NewsletterSignup',
    ]);
  });

  it('lets the self-contained defaults parse once given an id', () => {
    for (const type of ['CollectionTiles', 'OutfitList', 'FeaturedLookbook', 'Gallery', 'NewsletterSignup'] as const) {
      expect(homeSectionSchema.safeParse({ type, props: { id: type, ...HOME_SECTION_DEFAULTS[type] } }).success).toBe(true);
    }
  });
});

describe('section schemas', () => {
  it('defaults visible to true and strips unknown keys', () => {
    const parsed = homeSectionSchema.parse({ type: 'FeaturedLookbook', props: { id: 'a', source: 'featured', junk: 1 } });
    expect(parsed.props).toEqual({ id: 'a', source: 'featured', visible: true });
  });

  it('accepts an OutfitList without count', () => {
    expect(homeSectionSchema.safeParse(withProps('OutfitList', { count: undefined })).success).toBe(true);
    expect(firstIssuePath(withProps('OutfitList', { count: 0 }))).toBe('props.count');
  });

  it('rejects unsafe links in every section that has one', () => {
    const hero = sampleOf('HeroSlider');
    const slides = [{ image, alt: 'x', ctaLabel: 'Go', ctaHref: 'javascript:alert(1)' }];
    expect(firstIssuePath({ ...hero, props: { ...hero.props, slides } })).toBe('props.slides.0.ctaHref');
    expect(firstIssuePath(withProps('TextWithImage', { ctaHref: '//evil.example' }))).toBe('props.ctaHref');
    expect(firstIssuePath(withProps('CampaignBanner', { ctaHref: 'javascript:alert(1)' }))).toBe('props.ctaHref');
  });

  it.each([
    ['HeroSlider', { slides: [] }, 'props.slides'],
    ['HeroSlider', { autoplaySeconds: 2 }, 'props.autoplaySeconds'],
    ['HeroSlider', { autoplaySeconds: 31 }, 'props.autoplaySeconds'],
    ['CollectionTiles', { columnsDesktop: 7 }, 'props.columnsDesktop'],
    ['CollectionTiles', { collectionIds: ['bad'] }, 'props.collectionIds.0'],
    ['OutfitList', { columnsDesktop: 1 }, 'props.columnsDesktop'],
    ['OutfitList', { collectionIds: Array.from({ length: 7 }, () => ID) }, 'props.collectionIds'],
    ['OutfitList', { outfitIds: Array.from({ length: 49 }, () => ID) }, 'props.outfitIds'],
    ['TextWithImage', { body: 'x'.repeat(2001) }, 'props.body'],
    ['TextWithImage', { heading: '' }, 'props.heading'],
    ['Faq', { items: [] }, 'props.items'],
    ['Faq', { items: Array.from({ length: 31 }, () => ({ question: 'q', answer: 'a' })) }, 'props.items'],
    ['CampaignBanner', { heading: '' }, 'props.heading'],
    ['CampaignBanner', { image: undefined }, 'props.image'],
    ['CampaignBanner', { body: 'x'.repeat(401) }, 'props.body'],
    ['Marquee', { items: [] }, 'props.items'],
    ['Marquee', { items: Array.from({ length: 13 }, () => ({ text: 'x' })) }, 'props.items'],
    ['Marquee', { items: [{ text: '' }] }, 'props.items.0.text'],
    ['Marquee', { durationSeconds: 9 }, 'props.durationSeconds'],
    ['Marquee', { durationSeconds: 121 }, 'props.durationSeconds'],
    ['Gallery', { collectionIds: [ID, ID] }, 'props.collectionIds'],
    ['Gallery', { count: 13 }, 'props.count'],
    ['Gallery', { count: 0 }, 'props.count'],
    ['Gallery', { source: 'featured' }, 'props.source'],
    ['NewsletterSignup', { buttonLabel: '' }, 'props.buttonLabel'],
    ['NewsletterSignup', { heading: '' }, 'props.heading'],
    ['NewsletterSignup', { successMessage: 'x'.repeat(161) }, 'props.successMessage'],
    ['Faq', { eyebrow: 'x'.repeat(41) }, 'props.eyebrow'],
    ['Commitments', { items: [{ icon: 'truck', title: 't', text: 'x' }] }, 'props.items'],
    ['Commitments', { items: [1, 2, 3, 4, 5].map(() => ({ icon: 'truck', title: 't', text: 'x' })) }, 'props.items'],
    ['Commitments', { items: [{ icon: 'rocket', title: 't', text: 'x' }, { icon: 'truck', title: 't', text: 'x' }] }, 'props.items.0.icon'],
  ])('rejects %s with %j at %s', (type, props, path) => {
    expect(firstIssuePath(withProps(type, props))).toBe(path);
  });

  it('accepts autoplay 0 (off) and 3', () => {
    expect(homeSectionSchema.safeParse(withProps('HeroSlider', { autoplaySeconds: 0 })).success).toBe(true);
    expect(homeSectionSchema.safeParse(withProps('HeroSlider', { autoplaySeconds: 3 })).success).toBe(true);
  });

  it('rejects an unknown type', () => {
    expect(homeSectionSchema.safeParse({ type: 'Puck', props: { id: 'a' } }).success).toBe(false);
  });
});

describe('homeLayoutContentSchema', () => {
  it('rejects duplicate ids at the second occurrence', () => {
    const [first] = DEFAULT_HOME_CONTENT;
    const result = homeLayoutContentSchema.safeParse([first, first]);
    expect(result.success ? null : result.error.issues[0]?.path.join('.')).toBe('1.props.id');
  });

  it(`allows at most ${MAX_HOME_SECTIONS} sections`, () => {
    const many = Array.from({ length: MAX_HOME_SECTIONS + 1 }, (_, i) => ({
      type: 'FeaturedLookbook',
      props: { id: `s${i}`, source: 'featured' },
    }));
    expect(homeLayoutContentSchema.safeParse(many).success).toBe(false);
    expect(homeLayoutContentSchema.safeParse(many.slice(1)).success).toBe(true);
  });
});

describe('home layout requests', () => {
  it('save requires content and a nullable baseUpdatedAt key', () => {
    expect(saveHomeDraftRequestSchema.safeParse({ content: [], baseUpdatedAt: null }).success).toBe(true);
    expect(saveHomeDraftRequestSchema.safeParse({ content: [] }).success).toBe(false);
  });

  it('publish is locked to the draft timestamp', () => {
    expect(publishHomeRequestSchema.safeParse({ baseUpdatedAt: '2026-11-07T00:00:00.000Z' }).success).toBe(true);
    expect(publishHomeRequestSchema.safeParse({}).success).toBe(false);
  });

  it('restore requires the basePublishedAt key but accepts null', () => {
    expect(restorePreviousHomeRequestSchema.safeParse({ basePublishedAt: null }).success).toBe(true);
    const missing = restorePreviousHomeRequestSchema.safeParse({});
    expect(missing.success ? null : missing.error.issues[0]?.path.join('.')).toBe('basePublishedAt');
  });
});
