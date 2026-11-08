import { HOME_SECTION_DEFAULTS, type CollectionInput, type HomeLayoutContent, type HomeSection } from '@under30ss/shared';
import { buildOutfitPayload } from './outfit-payloads';
import { TEST_ORIGIN, type loggedInAgent } from './test-app';

export type Agent = Awaited<ReturnType<typeof loggedInAgent>>;

/** Thin wrappers that attach the Origin header every admin write needs. */
export const adminApi = (agent: Agent) => ({
  get: (url: string) => agent.get(url),
  post: (url: string, body: object = {}) => agent.post(url).set('Origin', TEST_ORIGIN).send(body),
  put: (url: string, body: object = {}) => agent.put(url).set('Origin', TEST_ORIGIN).send(body),
  del: (url: string) => agent.delete(url).set('Origin', TEST_ORIGIN),
});

export const COVER = { key: 'public/model/2026/11/cover.webp', width: 800, height: 600 };

export const buildCollectionPayload = (overrides: Partial<CollectionInput> = {}): CollectionInput => ({
  slug: 'summer',
  name: 'Summer',
  status: 'published',
  coverImage: COVER,
  ...overrides,
});

export const createCollectionVia = async (agent: Agent, overrides: Partial<CollectionInput> = {}) => {
  const response = await adminApi(agent).post('/api/admin/collections', buildCollectionPayload(overrides));
  if (response.status !== 201) throw new Error(`create collection failed: ${response.status} ${JSON.stringify(response.body)}`);
  return response.body as { id: string; slug: string; order: number };
};

export const createOutfitVia = async (
  agent: Agent,
  slug: string,
  extra: Record<string, unknown> = {},
): Promise<{ id: string; slug: string }> => {
  const response = await adminApi(agent).post('/api/admin/outfits', {
    ...buildOutfitPayload({ slug, title: slug, status: 'published' }),
    ...extra,
  });
  if (response.status !== 201) throw new Error(`create outfit failed: ${response.status} ${JSON.stringify(response.body)}`);
  return response.body as { id: string; slug: string };
};

type PropsOf<T extends HomeSection['type']> = Extract<HomeSection, { type: T }>['props'];

export const outfitListSection = (id: string, overrides: Partial<PropsOf<'OutfitList'>> = {}): HomeSection => ({
  type: 'OutfitList',
  props: { id, ...HOME_SECTION_DEFAULTS.OutfitList, ...overrides },
});

export const collectionTilesSection = (id: string, overrides: Partial<PropsOf<'CollectionTiles'>> = {}): HomeSection => ({
  type: 'CollectionTiles',
  props: { id, ...HOME_SECTION_DEFAULTS.CollectionTiles, ...overrides },
});

export const featuredLookbookSection = (id: string, overrides: Partial<PropsOf<'FeaturedLookbook'>> = {}): HomeSection => ({
  type: 'FeaturedLookbook',
  props: { id, ...HOME_SECTION_DEFAULTS.FeaturedLookbook, ...overrides },
});

export const faqSection = (id: string, overrides: Partial<PropsOf<'Faq'>> = {}): HomeSection => ({
  type: 'Faq',
  props: { id, ...HOME_SECTION_DEFAULTS.Faq, items: [{ question: 'Giao hàng bao lâu?', answer: '2-3 ngày' }], ...overrides },
});

export const heroSection = (id: string, imageKey = COVER.key): HomeSection => ({
  type: 'HeroSlider',
  props: {
    id,
    ...HOME_SECTION_DEFAULTS.HeroSlider,
    slides: [{ image: { key: imageKey, width: 1600, height: 900, url: 'http://client-supplied.test/ignored.webp' }, alt: 'Banner' }],
  },
});

export const saveDraftVia = (agent: Agent, content: HomeLayoutContent, baseUpdatedAt: string | null) =>
  adminApi(agent).put('/api/admin/home/draft', { content, baseUpdatedAt });
