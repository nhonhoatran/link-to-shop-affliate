'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { HOME_SECTION_COPY } from './home-section-copy';
import styles from './scroll-rail.module.css';
import { useScrollRail } from './use-scroll-rail';

interface ScrollRailProps {
  /** Accessible name of the scrollable list. */
  label: string;
  /** One `li` per item. */
  children: ReactNode;
}

export function ScrollRail({ label, children }: ScrollRailProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const { atStart, atEnd, scrollPage } = useScrollRail(trackRef);
  return (
    <div className={styles.rail}>
      <ul ref={trackRef} className={styles.track} tabIndex={0} aria-label={label}>
        {children}
      </ul>
      <button
        type="button"
        className={`${styles.button} ${styles.previous}`}
        aria-label={HOME_SECTION_COPY.rail.previous}
        disabled={atStart}
        onClick={() => scrollPage(-1)}
      >
        <DecorativeIcon icon={ChevronLeft} />
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.next}`}
        aria-label={HOME_SECTION_COPY.rail.next}
        disabled={atEnd}
        onClick={() => scrollPage(1)}
      >
        <DecorativeIcon icon={ChevronRight} />
      </button>
    </div>
  );
}
