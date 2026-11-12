'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FEED_COPY } from '@/components/public/public-copy';
import { PHOTO_TRACK_SELECTOR, prefersReducedMotion, stepPhoto } from './feed-photo-scroll';
import styles from './outfit-feed.module.css';

const EDGE_TOLERANCE_PX = 2;
const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const KEY_STEP: Record<string, -1 | 1> = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 };
const KEY_PHOTO: Record<string, -1 | 1> = { ArrowRight: 1, ArrowLeft: -1 };

const slideTop = (slide: Element, scroller: HTMLElement): number =>
  slide.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

function Chevron({ down }: { down: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        d={down ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const nearestSlide = (slides: readonly Element[], scroller: HTMLElement): { index: number; tops: number[] } => {
  const tops = slides.map((slide) => slideTop(slide, scroller));
  let index = 0;
  tops.forEach((top, i) => {
    if (Math.abs(top - scroller.scrollTop) < Math.abs(tops[index]! - scroller.scrollTop)) index = i;
  });
  return { index, tops };
};

/**
 * Round up/down buttons plus ArrowUp/ArrowDown/PageUp/PageDown, moving the feed one slide at a time;
 * ArrowLeft/ArrowRight move through the photos of the slide on screen.
 */
export function FeedStepButtons() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const getScroller = useCallback(
    () => rootRef.current?.parentElement?.querySelector<HTMLElement>('[data-feed]') ?? null,
    [],
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      const scroller = getScroller();
      if (!scroller) return;
      const slides = Array.from(scroller.querySelectorAll('[data-feed-slide]'));
      if (slides.length === 0) return;
      const { index: current, tops } = nearestSlide(slides, scroller);
      const target = current + direction;
      if (target < 0) return;
      scroller.scrollTo({
        top: target < tops.length ? tops[target]! : scroller.scrollHeight,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    },
    [getScroller],
  );

  const stepCurrentPhoto = useCallback(
    (direction: -1 | 1) => {
      const scroller = getScroller();
      if (!scroller) return;
      const slides = Array.from(scroller.querySelectorAll('[data-feed-slide]'));
      if (slides.length === 0) return;
      const track = slides[nearestSlide(slides, scroller).index]!.querySelector<HTMLElement>(PHOTO_TRACK_SELECTOR);
      if (track) stepPhoto(track, direction);
    },
    [getScroller],
  );

  useEffect(() => {
    const scroller = getScroller();
    if (!scroller) return;
    const update = () =>
      setEdge({
        start: scroller.scrollTop <= EDGE_TOLERANCE_PX,
        end: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - EDGE_TOLERANCE_PX,
      });
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_STEP[event.key];
      const photoDirection = KEY_PHOTO[event.key];
      if ((!direction && !photoDirection) || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest(EDITABLE) || target.closest('dialog')) return;
      if (target !== document.body && !rootRef.current?.parentElement?.contains(target)) return;
      event.preventDefault();
      if (direction) step(direction);
      else if (photoDirection) stepCurrentPhoto(photoDirection);
    };
    update();
    // A loaded batch grows the feed without a scroll event, which would leave the down button disabled.
    const growth = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update);
    growth?.observe(scroller, { childList: true, subtree: true });
    scroller.addEventListener('scroll', update, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    return () => {
      growth?.disconnect();
      scroller.removeEventListener('scroll', update);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [getScroller, step, stepCurrentPhoto]);

  return (
    <div ref={rootRef} className={styles.steps}>
      <button type="button" className={styles.step} aria-label={FEED_COPY.previous} disabled={edge.start} onClick={() => step(-1)}>
        <Chevron down={false} />
      </button>
      <button type="button" className={styles.step} aria-label={FEED_COPY.next} disabled={edge.end} onClick={() => step(1)}>
        <Chevron down />
      </button>
    </div>
  );
}
