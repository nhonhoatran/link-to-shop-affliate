import type { HomeSectionOf, HomeSectionType } from './home-section-union';

export type HomeSectionDefaultProps<T extends HomeSectionType> = Omit<HomeSectionOf<T>['props'], 'id'>;

// Starting props for a block added in the editor. These are defaults the admin edits per section, not constants.
// Content fields (slides, FAQ text, commitments text) start empty, so the block fails validation until filled in.
export const HOME_SECTION_DEFAULTS: { [T in HomeSectionType]: HomeSectionDefaultProps<T> } = {
  HeroSlider: { visible: true, slides: [], autoplaySeconds: 6 },
  CollectionTiles: {
    visible: true,
    title: 'Bộ sưu tập',
    mode: 'auto',
    collectionIds: [],
    count: 6,
    columnsDesktop: 3,
    showViewAll: true,
  },
  OutfitList: {
    visible: true,
    title: 'Outfit mới',
    source: 'latest',
    collectionIds: [],
    outfitIds: [],
    display: 'carousel',
    columnsDesktop: 4,
    excludeFeatured: false,
    showViewAll: true,
  },
  FeaturedLookbook: { visible: true, source: 'featured' },
  TextWithImage: { visible: true, heading: '', body: '', imagePosition: 'right' },
  Faq: { visible: true, title: 'Câu hỏi thường gặp', items: [{ question: '', answer: '' }] },
  Commitments: {
    visible: true,
    items: [
      { icon: 'truck', title: '', text: '' },
      { icon: 'shield-check', title: '', text: '' },
    ],
  },
};
