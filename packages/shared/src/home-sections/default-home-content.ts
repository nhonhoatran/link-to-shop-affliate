import { HOME_SECTION_DEFAULTS } from './home-section-defaults';
import type { HomeLayoutContent } from './home-section-union';

// Matches the home page before sections existed: featured lookbook, "more outfits" grid, collection tiles
// (the tiles hide themselves while no collection is published). `count` is left unset so the
// `relatedOutfitsCount` setting still decides the grid size.
export const DEFAULT_HOME_CONTENT: HomeLayoutContent = [
  { type: 'FeaturedLookbook', props: { id: 'default-featured-lookbook', ...HOME_SECTION_DEFAULTS.FeaturedLookbook } },
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
  { type: 'CollectionTiles', props: { id: 'default-collection-tiles', ...HOME_SECTION_DEFAULTS.CollectionTiles } },
];
