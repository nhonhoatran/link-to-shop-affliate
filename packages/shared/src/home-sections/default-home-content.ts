import { HOME_SECTION_DEFAULTS } from './home-section-defaults';
import type { HomeLayoutContent } from './home-section-union';

// Featured lookbook, collection tiles, "more outfits" tabs, gallery and newsletter signup. `count` of the outfit list
// is left unset so the `relatedOutfitsCount` setting still decides its size. Collection tiles hide themselves while no
// collection is published, and the signup form stays hidden until the admin saves a consent sentence in settings.
export const DEFAULT_HOME_CONTENT: HomeLayoutContent = [
  { type: 'FeaturedLookbook', props: { id: 'default-featured-lookbook', ...HOME_SECTION_DEFAULTS.FeaturedLookbook } },
  { type: 'CollectionTiles', props: { id: 'default-collection-tiles', ...HOME_SECTION_DEFAULTS.CollectionTiles } },
  {
    type: 'OutfitList',
    props: {
      id: 'default-outfit-list',
      ...HOME_SECTION_DEFAULTS.OutfitList,
      title: 'Outfit khác',
      display: 'grid',
      excludeFeatured: true,
    },
  },
  { type: 'Gallery', props: { id: 'default-gallery', ...HOME_SECTION_DEFAULTS.Gallery } },
  { type: 'NewsletterSignup', props: { id: 'default-newsletter-signup', ...HOME_SECTION_DEFAULTS.NewsletterSignup } },
];
