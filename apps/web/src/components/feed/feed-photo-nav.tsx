'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FEED_COPY } from '@/components/public/public-copy';
import { PHOTO_TRACK_SELECTOR, currentPhotoIndex, scrollToPhoto } from './feed-photo-scroll';
import styles from './feed-post-controls.module.css';

// Beyond this many photos the dots would run into the action rail on a phone, so a counter replaces them.
const MAX_DOTS = 10;

/** Dots and side arrows for the photo track of the slide this sits in. Swiping works without it. */
export function FeedPhotoNav({ total }: { total: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const getTrack = useCallback(
    () => rootRef.current?.closest('[data-feed-slide]')?.querySelector<HTMLElement>(PHOTO_TRACK_SELECTOR) ?? null,
    [],
  );

  useEffect(() => {
    const track = getTrack();
    if (!track) return;
    const update = () => setIndex(currentPhotoIndex(track));
    update();
    track.addEventListener('scroll', update, { passive: true });
    return () => track.removeEventListener('scroll', update);
  }, [getTrack]);

  if (total < 2) return null;

  const go = (target: number) => {
    const track = getTrack();
    if (track) scrollToPhoto(track, target);
  };

  return (
    <div ref={rootRef} className={styles.nav}>
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowPrevious}`}
        aria-label={FEED_COPY.previousPhoto}
        disabled={index === 0}
        onClick={() => go(index - 1)}
      >
        <ChevronLeft aria-hidden="true" focusable="false" />
      </button>
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowNext}`}
        aria-label={FEED_COPY.nextPhoto}
        disabled={index >= total - 1}
        onClick={() => go(index + 1)}
      >
        <ChevronRight aria-hidden="true" focusable="false" />
      </button>
      <div className={styles.dots}>
        {total > MAX_DOTS ? (
          <span className={styles.counter} aria-live="polite">
            {index + 1}/{total}
          </span>
        ) : Array.from({ length: total }, (_, dot) => (
          <button
            key={dot}
            type="button"
            className={styles.dot}
            aria-label={FEED_COPY.photoLabel(dot + 1, total)}
            aria-current={dot === index ? 'true' : undefined}
            onClick={() => go(dot)}
          />
        ))}
      </div>
    </div>
  );
}
