import { expect, type APIRequestContext } from '@playwright/test';
import type { ImageRef } from './collection-fixtures';
import { stripUrl } from './collection-fixtures';

export interface HomeLayoutDto {
  draft: unknown[];
  draftUpdatedAt: string | null;
  publishedAt: string | null;
  previous: { publishedAt: string | null } | null;
  hasUnpublishedChanges: boolean;
  usingDefault: boolean;
}

export async function readHome(api: APIRequestContext): Promise<HomeLayoutDto> {
  const response = await api.get('/api/admin/home');
  expect(response.ok(), 'read home layout').toBe(true);
  return (await response.json()) as HomeLayoutDto;
}

/** Back to the built-in default layout. Keeps one restorable previous version, like the admin reset button. */
export async function resetHome(api: APIRequestContext): Promise<void> {
  const response = await api.post('/api/admin/home/reset');
  expect(response.ok(), 'reset home layout').toBe(true);
}

/** Saves `content` as the draft and publishes it, the same two calls the editor makes. */
export async function publishLayout(api: APIRequestContext, content: unknown[]): Promise<void> {
  const saved = await api.put('/api/admin/home/draft', { data: { content, baseUpdatedAt: (await readHome(api)).draftUpdatedAt } });
  expect(saved.ok(), 'save home draft').toBe(true);
  const draftUpdatedAt = ((await saved.json()) as { draftUpdatedAt: string }).draftUpdatedAt;
  const published = await api.post('/api/admin/home/publish', { data: { baseUpdatedAt: draftUpdatedAt } });
  expect(published.ok(), 'publish home layout').toBe(true);
}

/** Undoes the last publish, like the toast button or the "Hoàn tác lần đăng gần nhất" menu item. */
export async function restorePreviousPublish(api: APIRequestContext): Promise<void> {
  const home = await readHome(api);
  const response = await api.post('/api/admin/home/restore-previous', { data: { basePublishedAt: home.publishedAt } });
  expect(response.ok(), 'restore previous home layout').toBe(true);
}

/** One section of each of the seven types, with ids unique within the layout. */
/** Two or more collections in the outfit list render as radio tabs. */
export function sevenTypeLayout(
  image: ImageRef,
  outfitId: string,
  collectionIds: string[],
  labels: { hero: string; faq: string },
): unknown[] {
  const picture = stripUrl(image);
  return [
    {
      type: 'HeroSlider',
      props: {
        id: 'e2e-hero',
        visible: true,
        label: 'Banner e2e',
        autoplaySeconds: 3,
        slides: [
          { image: picture, alt: 'Ảnh banner đầu', heading: labels.hero, text: 'Mô tả banner', ctaLabel: 'Xem', ctaHref: '/looks' },
          { image: picture, alt: 'Ảnh banner thứ hai', heading: 'Banner thứ hai' },
        ],
      },
    },
    {
      type: 'CollectionTiles',
      props: {
        id: 'e2e-tiles',
        visible: true,
        title: 'Bộ sưu tập e2e',
        mode: 'manual',
        collectionIds,
        count: 3,
        columnsDesktop: 3,
        showViewAll: true,
      },
    },
    {
      type: 'OutfitList',
      props: {
        id: 'e2e-list',
        visible: true,
        title: 'Outfit mới e2e',
        source: 'collection',
        collectionIds,
        outfitIds: [],
        count: 4,
        display: 'carousel',
        columnsDesktop: 4,
        excludeFeatured: false,
        showViewAll: true,
      },
    },
    { type: 'FeaturedLookbook', props: { id: 'e2e-lookbook', visible: true, source: 'manual', outfitId } },
    {
      type: 'TextWithImage',
      props: {
        id: 'e2e-text',
        visible: true,
        heading: 'Về chúng tôi e2e',
        body: 'Đoạn một.\n\nĐoạn hai.',
        image: picture,
        alt: 'Ảnh minh hoạ',
        imagePosition: 'left',
        ctaLabel: 'Tìm hiểu',
        ctaHref: '/looks',
      },
    },
    {
      type: 'Faq',
      props: {
        id: 'e2e-faq',
        visible: true,
        title: labels.faq,
        items: [
          { question: 'Giao hàng mất bao lâu?', answer: 'Trong 2 đến 3 ngày.' },
          { question: 'Có đổi trả không?', answer: 'Có, trong 7 ngày.' },
        ],
      },
    },
    {
      type: 'Commitments',
      props: {
        id: 'e2e-commitments',
        visible: true,
        items: [
          { icon: 'truck', title: 'Giao nhanh', text: 'Giao trong ngày ở nội thành.' },
          { icon: 'shield-check', title: 'Chính hãng', text: 'Cam kết hàng chính hãng.' },
        ],
      },
    },
  ];
}
