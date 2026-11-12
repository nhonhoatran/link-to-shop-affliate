import Image from 'next/image';
import type { PublicOutfitDto } from '@under30ss/shared';
import { LookbookLayout } from '@/components/lookbook';
import { FEED_COPY } from '@/components/public/public-copy';
import { FeedItemPhoto } from './feed-item-photo';
import { FEED_PHOTO_SIZES } from './feed-photo-sizes';
import styles from './feed-post.module.css';

/** Photo 1 is the lookbook, photo 2 the model, then one photo per item (items arrive sorted from the DTO). */
export const feedPhotoTotal = (outfit: PublicOutfitDto): number => 2 + outfit.items.length;

export function FeedPhotoTrack({ outfit, preload }: { outfit: PublicOutfitDto; preload: boolean }) {
  const total = feedPhotoTotal(outfit);
  const { modelImage } = outfit;
  return (
    <ul className={styles.track} data-photo-track aria-label={FEED_COPY.photos}>
      <li className={`${styles.photo} ${styles.lightPhoto}`} aria-roledescription="slide" aria-label={FEED_COPY.photoLabel(1, total)}>
        <div className={styles.fitArea}>
          <LookbookLayout outfit={outfit} headingLevel="h2" preload={preload} fill />
        </div>
      </li>
      <li className={styles.photo} aria-roledescription="slide" aria-label={FEED_COPY.photoLabel(2, total)}>
        <Image
          src={modelImage.url}
          alt={FEED_COPY.modelPhoto(outfit.title)}
          width={modelImage.width}
          height={modelImage.height}
          sizes={FEED_PHOTO_SIZES}
          className={styles.containImage}
        />
      </li>
      {outfit.items.map((item, index) => (
        <FeedItemPhoto key={item.id} item={item} label={FEED_COPY.photoLabel(index + 3, total)} />
      ))}
    </ul>
  );
}
