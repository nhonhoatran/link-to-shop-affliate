import type { PublicOutfitDto } from '@under30ss/shared';
import { outfitPath } from '@/lib/seo/absolute-url';
import { FeedShareButton } from './feed-share-button';
import { FeedShopSheet } from './feed-shop-sheet';
import styles from './feed-post-controls.module.css';

export function FeedActionRail({ outfit }: { outfit: PublicOutfitDto }) {
  return (
    <div className={styles.rail}>
      <FeedShopSheet items={outfit.items} />
      <FeedShareButton title={outfit.title} path={outfitPath(outfit.slug)} />
    </div>
  );
}
