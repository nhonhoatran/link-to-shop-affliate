import { homeLayoutContentSchema, type HomeLayoutContent, type HomeSectionOf, type HomeSectionType } from '../home-sections';
import type { ResolvedHomeSection } from '../home-layout-contract';
import { sampleOutfitCards } from './sample-home-sections';
import { sampleNewsletterConsent } from './sample-newsletter';

const FIXTURE_MEDIA_BASE = 'https://media.example.test/public/fixtures';

const image = (name: string, width = 1600, height = 900) => ({
  key: `public/fixtures/${name}.webp`,
  url: `${FIXTURE_MEDIA_BASE}/${name}.webp`,
  width,
  height,
});

// Kept apart from sampleHomeSections: tests index into that list and render it through the real views.
export const sampleEditorialHomeSections: HomeLayoutContent = homeLayoutContentSchema.parse([
  {
    type: 'CampaignBanner',
    props: {
      id: 'sample-campaign-banner',
      eyebrow: 'Chiến dịch',
      heading: 'Bộ sưu tập mùa mới',
      body: 'Những outfit gọn gàng cho ngày đi làm và cuối tuần.',
      image: image('campaign', 1200, 1500),
      alt: 'Người mẫu mặc outfit mùa mới',
      imagePosition: 'left',
      ctaLabel: 'Xem ngay',
      ctaHref: '/looks',
    },
  },
  {
    type: 'Marquee',
    props: {
      id: 'sample-marquee',
      label: 'Thông tin cửa hàng',
      items: [{ text: 'Outfit mới mỗi tuần' }, { text: 'Gợi ý phối đồ' }, { text: 'Xem miễn phí' }],
      durationSeconds: 30,
    },
  },
  {
    type: 'Gallery',
    props: {
      id: 'sample-gallery',
      eyebrow: 'Thư viện',
      title: 'Thư viện ảnh',
      note: 'Các outfit mới nhất',
      source: 'latest',
      collectionIds: [],
      outfitIds: [],
      count: 6,
    },
  },
  {
    type: 'NewsletterSignup',
    props: {
      id: 'sample-newsletter',
      eyebrow: 'Bản tin',
      heading: 'Nhận tin mới',
      body: 'Outfit mới gửi thẳng vào hộp thư.',
      buttonLabel: 'Đăng ký',
      successMessage: 'Cảm ơn bạn đã đăng ký',
      finePrint: 'Mỗi tuần một email.',
    },
  },
]);

const section = <T extends HomeSectionType>(type: T): HomeSectionOf<T> => {
  const found = sampleEditorialHomeSections.find((candidate): candidate is HomeSectionOf<T> => candidate.type === type);
  if (!found) throw new Error(`Missing ${type} in sampleEditorialHomeSections`);
  return found;
};

export const sampleResolvedEditorialSections: ResolvedHomeSection[] = [
  section('CampaignBanner'),
  section('Marquee'),
  { ...section('Gallery'), data: { items: sampleOutfitCards } },
  { ...section('NewsletterSignup'), data: { consent: sampleNewsletterConsent } },
];
