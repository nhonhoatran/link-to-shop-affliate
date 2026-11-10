import type { PublicOutfitDto } from '@under30ss/shared';
import { FEED_COPY } from '@/components/public/public-copy';
import { buildPublicNavItems } from '@/components/public/public-nav-items';
import { SiteFooter } from '@/components/public/site-footer';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { FeedLoadMore } from './feed-load-more';
import { FeedStepButtons } from './feed-step-buttons';
import { OutfitFeedSlides } from './outfit-feed-slide';
import styles from './outfit-feed.module.css';

interface OutfitFeedProps {
  outfits: readonly PublicOutfitDto[];
  nextPage: number | null;
  /** Batch size of the first page; later batches must match or they overlap or skip outfits. */
  size: number;
  /** Path of the page hosting the feed; the no-JavaScript "next" link points at `${basePath}?page=N`. */
  basePath: string;
  collection?: string | undefined;
}

async function FeedFooter() {
  const settings = await getPublicSettings();
  return (
    <div className={styles.footerSnap}>
      <SiteFooter
        siteName={settings.siteName}
        description={settings.seoDescription}
        navItems={buildPublicNavItems(settings)}
        footer={settings.footer ?? { columns: [], social: [] }}
        insideMain
      />
    </div>
  );
}

/** One lookbook per screen. While a feed is on the page the shell becomes a fixed-height frame (see public-shell.module.css). */
export function OutfitFeed({ outfits, nextPage, size, basePath, collection }: OutfitFeedProps) {
  return (
    <div className={styles.wrap} data-feed-wrap>
      <div className={styles.feed} data-feed tabIndex={0} role="region" aria-label={FEED_COPY.region}>
        <OutfitFeedSlides outfits={outfits} preloadFirst />
        <FeedLoadMore nextPage={nextPage} size={size} collection={collection} basePath={basePath} footer={<FeedFooter />} />
      </div>
      <FeedStepButtons />
    </div>
  );
}
