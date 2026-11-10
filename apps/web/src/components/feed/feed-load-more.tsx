'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FEED_COPY } from '@/components/public/public-copy';
import { loadFeedPage } from '@/lib/feed/load-feed-page-action';
import styles from './outfit-feed.module.css';

interface FeedLoadMoreProps {
  /** Next batch number, or null when the server already sent everything. */
  nextPage: number | null;
  size: number;
  collection?: string | undefined;
  /** Path the no-JavaScript link and crawlers use: `${basePath}?page=N`. */
  basePath: string;
  /** Shown only once there is nothing left to load. */
  footer: ReactNode;
}

type Status = 'idle' | 'loading' | 'error';

const readRootMargin = (scroller: Element): string => {
  const margin = getComputedStyle(scroller).getPropertyValue('--feed-preload-margin').trim();
  return `0px 0px ${margin || '100%'} 0px`;
};

export function FeedLoadMore({ nextPage: initialNextPage, size, collection, basePath, footer }: FeedLoadMoreProps) {
  const [batches, setBatches] = useState<ReactNode[]>([]);
  const [nextPage, setNextPage] = useState(initialNextPage);
  const [status, setStatus] = useState<Status>('idle');
  const busy = useRef(false);
  const sentinelRef = useRef<HTMLAnchorElement>(null);

  const loadNext = useCallback(async () => {
    if (nextPage === null || busy.current) return;
    busy.current = true;
    setStatus('loading');
    try {
      const batch = await loadFeedPage({ page: nextPage, size, ...(collection ? { collection } : {}) });
      setBatches((previous) => [...previous, <Fragment key={nextPage}>{batch.slides}</Fragment>]);
      setNextPage(batch.nextPage);
      setStatus('idle');
    } catch (error) {
      console.error('Failed to load more outfits', error);
      setStatus('error');
    } finally {
      busy.current = false;
    }
  }, [nextPage, size, collection]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scroller = sentinel?.closest('[data-feed]');
    if (!sentinel || !scroller || status === 'error' || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadNext();
      },
      { root: scroller, rootMargin: readRootMargin(scroller) },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNext, status, nextPage]);

  return (
    <>
      {batches}
      {nextPage === null ? (
        footer
      ) : (
        <a
          ref={sentinelRef}
          href={`${basePath}?page=${nextPage}`}
          rel="next"
          className={styles.more}
          onClick={(event) => {
            event.preventDefault();
            void loadNext();
          }}
        >
          <span role="status">
            {status === 'loading' ? FEED_COPY.loading : status === 'error' ? FEED_COPY.retry : FEED_COPY.more}
          </span>
        </a>
      )}
    </>
  );
}
