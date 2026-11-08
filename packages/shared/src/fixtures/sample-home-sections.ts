import { homeLayoutContentSchema, type HomeLayoutContent, type HomeSectionOf, type HomeSectionType } from '../home-sections';
import type { PublicHomeResponse, ResolvedHomeSection } from '../home-layout-contract';
import type { PublicOutfitCardDto } from '../public-outfit-list-contract';
import { sampleCollectionCards, sampleCollectionIds } from './sample-collections';
import { samplePublicOutfit } from './sample-public-outfit';

const FIXTURE_MEDIA_BASE = 'https://media.example.test/public/fixtures';
const OUTFIT_ID = '64b7f0c2a1b2c3d4e5f60801';

const image = (name: string, width = 1600, height = 900) => ({
  key: `public/fixtures/${name}.webp`,
  url: `${FIXTURE_MEDIA_BASE}/${name}.webp`,
  width,
  height,
});

const outfitCard = (slug: string, title: string): PublicOutfitCardDto => ({
  slug,
  title,
  modelImage: image(`card-${slug}`, 400, 1000),
  updatedAt: '2026-11-06T00:00:00.000Z',
});

export const sampleOutfitCards: PublicOutfitCardDto[] = [
  outfitCard('dramatic-liberty-streetwear', 'Dramatic Liberty streetwear'),
  outfitCard('smart-casual-di-lam', 'Smart casual đi làm'),
  outfitCard('mua-he-nhe-nhang', 'Mùa hè nhẹ nhàng'),
  outfitCard('dao-pho-cuoi-tuan', 'Dạo phố cuối tuần'),
];

// One section of every type, in the order the editor offers them.
export const sampleHomeSections: HomeLayoutContent = homeLayoutContentSchema.parse([
  {
    type: 'HeroSlider',
    props: {
      id: 'sample-hero',
      label: 'Banner chính',
      autoplaySeconds: 6,
      slides: [
        { image: image('hero-1'), alt: 'Bộ sưu tập mới', heading: 'Bộ sưu tập mới', ctaLabel: 'Khám phá', ctaHref: '/collections' },
        { image: image('hero-2'), mobileImage: image('hero-2-mobile', 800, 1000), alt: 'Outfit mùa hè' },
      ],
    },
  },
  {
    type: 'CollectionTiles',
    props: {
      id: 'sample-collections',
      title: 'Bộ sưu tập',
      mode: 'manual',
      collectionIds: [...sampleCollectionIds],
      count: 6,
      columnsDesktop: 3,
      showViewAll: true,
    },
  },
  {
    type: 'OutfitList',
    props: {
      id: 'sample-outfits',
      title: 'Outfit mới',
      source: 'latest',
      collectionIds: [],
      outfitIds: [],
      display: 'carousel',
      columnsDesktop: 4,
      excludeFeatured: false,
      showViewAll: true,
    },
  },
  { type: 'FeaturedLookbook', props: { id: 'sample-lookbook', source: 'manual', outfitId: OUTFIT_ID } },
  {
    type: 'TextWithImage',
    props: {
      id: 'sample-text-image',
      heading: 'Về chúng tôi',
      body: 'Đoạn một.\n\nĐoạn hai.',
      image: image('about', 900, 900),
      alt: 'Góc cửa hàng',
      imagePosition: 'left',
      ctaLabel: 'Tìm hiểu thêm',
      ctaHref: '/looks',
    },
  },
  {
    type: 'Faq',
    props: {
      id: 'sample-faq',
      title: 'Câu hỏi thường gặp',
      items: [
        { question: 'Mua hàng ở đâu?', answer: 'Bấm vào món đồ để sang trang bán.' },
        { question: 'Có mất phí không?', answer: 'Không, xem outfit hoàn toàn miễn phí.' },
      ],
    },
  },
  {
    type: 'Commitments',
    props: {
      id: 'sample-commitments',
      items: [
        { icon: 'truck', title: 'Giao nhanh', text: 'Đối tác giao hàng toàn quốc.' },
        { icon: 'shield-check', title: 'Chính hãng', text: 'Chỉ dẫn tới gian hàng uy tín.' },
      ],
    },
  },
]);

const section = <T extends HomeSectionType>(type: T): HomeSectionOf<T> => {
  const found = sampleHomeSections.find((candidate): candidate is HomeSectionOf<T> => candidate.type === type);
  if (!found) throw new Error(`Missing ${type} in sampleHomeSections`);
  return found;
};

export const sampleResolvedHomeSections: ResolvedHomeSection[] = [
  section('HeroSlider'),
  { ...section('CollectionTiles'), data: { items: sampleCollectionCards } },
  { ...section('OutfitList'), data: { tabs: [{ key: 'latest', items: sampleOutfitCards }] } },
  { ...section('FeaturedLookbook'), data: { outfit: samplePublicOutfit } },
  section('TextWithImage'),
  section('Faq'),
  section('Commitments'),
];

export const samplePublicHome: PublicHomeResponse = { source: 'published', sections: sampleResolvedHomeSections };
