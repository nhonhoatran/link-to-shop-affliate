import type { PublicOutfitDto } from '@under30ss/shared';
import { FeedActionRail } from './feed-action-rail';
import { FeedPhotoNav } from './feed-photo-nav';
import { FeedPhotoTrack, feedPhotoTotal } from './feed-photo-track';
import { FeedPostCaption } from './feed-post-caption';
import styles from './outfit-feed.module.css';
import postStyles from './feed-post.module.css';

interface OutfitFeedSlideProps {
  outfit: PublicOutfitDto;
  /** Only the first slide on screen; the rest load lazily. */
  preload?: boolean;
}

/** One outfit as a photo post: swipe sideways through its photos, up/down to the next outfit. */
export function OutfitFeedSlide({ outfit, preload = false }: OutfitFeedSlideProps) {
  return (
    <article className={styles.slide} data-feed-slide>
      <div className={postStyles.post}>
        <FeedPhotoTrack outfit={outfit} preload={preload} />
        <FeedPostCaption outfit={outfit} />
        <FeedPhotoNav total={feedPhotoTotal(outfit)} />
        <FeedActionRail outfit={outfit} />
      </div>
    </article>
  );
}

export function OutfitFeedSlides({ outfits, preloadFirst = false }: { outfits: readonly PublicOutfitDto[]; preloadFirst?: boolean }) {
  return (
    <>
      {outfits.map((outfit, index) => (
        <OutfitFeedSlide key={outfit.slug} outfit={outfit} preload={preloadFirst && index === 0} />
      ))}
    </>
  );
}
