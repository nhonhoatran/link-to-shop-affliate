import Link from 'next/link';
import type { PublicOutfitDto } from '@under30ss/shared';
import { LookbookLayout } from '@/components/lookbook';
import { outfitPath } from '@/lib/seo/absolute-url';
import styles from './outfit-feed.module.css';

interface OutfitFeedSlideProps {
  outfit: PublicOutfitDto;
  /** Only the first slide on screen; the rest load lazily. */
  preload?: boolean;
}

export function OutfitFeedSlide({ outfit, preload = false }: OutfitFeedSlideProps) {
  return (
    <article className={styles.slide} data-feed-slide>
      <div className={styles.fitArea}>
        <LookbookLayout outfit={outfit} headingLevel="h2" preload={preload} fill />
      </div>
      <p className={styles.caption}>
        <Link href={outfitPath(outfit.slug)} className={styles.captionLink}>
          {outfit.title}
        </Link>
      </p>
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
