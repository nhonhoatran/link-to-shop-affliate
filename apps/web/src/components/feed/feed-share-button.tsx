'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { FEED_COPY } from '@/components/public/public-copy';
import styles from './feed-post-controls.module.css';

const FALLBACK_STATUS_MS = 2000;

const readStatusDuration = (element: Element | null): number => {
  if (!element) return FALLBACK_STATUS_MS;
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue('--feed-share-status-duration'));
  return Number.isFinite(value) ? value : FALLBACK_STATUS_MS;
};

const isAbort = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';

/** The phone's share menu; where there is none, copies the outfit link and says so. */
export function FeedShareButton({ title, path }: { title: string; path: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState('');

  useEffect(() => () => clearTimeout(timer.current), []);

  const announce = (message: string) => {
    setStatus(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(''), readStatusDuration(buttonRef.current));
  };

  const share = async () => {
    // The site's own origin: the link always points back here, whichever host the visitor came through.
    const url = new URL(path, window.location.origin).toString();
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
    } catch (error) {
      if (isAbort(error)) return;
      // Blocked by a permissions policy or a share already open: copying still gets the link out.
    }
    try {
      await navigator.clipboard.writeText(url);
      announce(FEED_COPY.copied);
    } catch {
      announce(FEED_COPY.shareFailed);
    }
  };

  return (
    <div className={styles.shareWrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.railButton} ${styles.needsScript}`}
        aria-label={FEED_COPY.share}
        onClick={share}
      >
        <Share2 aria-hidden="true" focusable="false" />
      </button>
      <span role="status" className={styles.shareStatus} data-visible={status ? '' : undefined}>
        {status}
      </span>
    </div>
  );
}
