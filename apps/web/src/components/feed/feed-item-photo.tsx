import Image from 'next/image';
import type { PublicOutfitItemDto } from '@under30ss/shared';
import { affiliateLinkProps } from '@/components/lookbook/lookbook-link-props';
import { FEED_COPY } from '@/components/public/public-copy';
import { FEED_PHOTO_SIZES } from './feed-photo-sizes';
import styles from './feed-post.module.css';

export function FeedItemPhoto({ item, label }: { item: PublicOutfitItemDto; label: string }) {
  return (
    <li className={`${styles.photo} ${styles.lightPhoto}`} aria-roledescription="slide" aria-label={label}>
      <div className={styles.itemPhoto}>
        <Image
          src={item.image.url}
          alt={item.name}
          width={item.image.width}
          height={item.image.height}
          sizes={FEED_PHOTO_SIZES}
          className={styles.itemImage}
        />
        <p className={styles.itemName}>{item.name}</p>
        {item.subtitle ? <p className={styles.itemSubtitle}>{item.subtitle}</p> : null}
        <a {...affiliateLinkProps(item.affiliateUrl)} className={styles.buy} aria-label={FEED_COPY.buyLabel(item.name)}>
          {FEED_COPY.buy}
        </a>
      </div>
    </li>
  );
}
