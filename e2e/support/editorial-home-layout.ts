import type { ImageRef } from './collection-fixtures';
import { stripUrl } from './collection-fixtures';
import { sevenTypeLayout } from './home-layout';

export const NEWSLETTER_HEADING = 'Nhận tin e2e';

/**
 * All eleven section types in one layout, in the order the page must render them. Reuses the seven-type layout
 * for the sections it already covers, so both layouts stay in step.
 */
export function editorialLayout(
  image: ImageRef,
  outfitIds: [string, string, string],
  collectionIds: string[],
  labels: { hero: string; faq: string },
): unknown[] {
  const [hero, tiles, list, lookbook, text, faq, commitments] = sevenTypeLayout(image, outfitIds[0], collectionIds, labels);
  const picture = stripUrl(image);
  return [
    hero,
    { type: 'Marquee', props: { id: 'e2e-marquee', visible: true, label: 'Thông điệp e2e', items: [{ text: 'Giao nhanh' }, { text: 'Hàng chính hãng' }], durationSeconds: 20 } },
    {
      type: 'CampaignBanner',
      props: {
        id: 'e2e-campaign',
        visible: true,
        eyebrow: 'Chiến dịch e2e',
        heading: 'Banner chiến dịch',
        body: 'Mô tả chiến dịch.',
        image: picture,
        alt: 'Ảnh chiến dịch',
        imagePosition: 'right',
        ctaLabel: 'Xem ngay',
        ctaHref: '/looks',
      },
    },
    tiles,
    lookbook,
    list,
    {
      type: 'Gallery',
      props: {
        id: 'e2e-gallery',
        visible: true,
        eyebrow: 'Thư viện',
        title: 'Thư viện e2e',
        source: 'manual',
        collectionIds: [],
        outfitIds,
        count: outfitIds.length,
      },
    },
    text,
    faq,
    commitments,
    {
      type: 'NewsletterSignup',
      props: {
        id: 'e2e-newsletter',
        visible: true,
        eyebrow: 'Bản tin',
        heading: NEWSLETTER_HEADING,
        body: 'Nhận outfit mới mỗi tuần.',
        buttonLabel: 'Đăng ký nhận tin',
        finePrint: 'Huỷ bất cứ lúc nào.',
      },
    },
  ];
}

/** Section ids in the order editorialLayout returns them; the render spec checks the DOM against this. */
export const EDITORIAL_SECTION_IDS = [
  'e2e-hero',
  'e2e-marquee',
  'e2e-campaign',
  'e2e-tiles',
  'e2e-lookbook',
  'e2e-list',
  'e2e-gallery',
  'e2e-text',
  'e2e-faq',
  'e2e-commitments',
  'e2e-newsletter',
] as const;
