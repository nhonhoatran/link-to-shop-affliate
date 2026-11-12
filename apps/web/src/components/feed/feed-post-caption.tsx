import Link from 'next/link';
import type { PublicOutfitDto } from '@under30ss/shared';
import { outfitPath } from '@/lib/seo/absolute-url';
import styles from './feed-post.module.css';

export function FeedPostCaption({ outfit }: { outfit: PublicOutfitDto }) {
  return (
    <div className={styles.caption}>
      <p className={styles.captionTitle}>
        <Link href={outfitPath(outfit.slug)} className={styles.captionLink}>
          {outfit.title}
        </Link>
      </p>
      {outfit.seoDescription ? <p className={styles.captionText}>{outfit.seoDescription}</p> : null}
    </div>
  );
}
