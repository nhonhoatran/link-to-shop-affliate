'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';

// Slightly below 1 so sub-pixel rounding never leaves the first or last item "not fully visible".
const FULLY_VISIBLE = 0.95;
const RATIO_STEPS = [0, 0.25, 0.5, 0.75, FULLY_VISIBLE, 1];

export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

/** Tracks which child of a scroll-snap track is visible and scrolls it by a page or to an index. */
export function useScrollRail(trackRef: RefObject<HTMLElement | null>) {
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === 'undefined') return;
    const slides = Array.from(track.children);
    const ratios = slides.map(() => 0);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios[slides.indexOf(entry.target)] = entry.intersectionRatio;
        setAtStart((ratios[0] ?? 0) >= FULLY_VISIBLE);
        setAtEnd((ratios[ratios.length - 1] ?? 0) >= FULLY_VISIBLE);
        setActive(ratios.indexOf(Math.max(...ratios)));
      },
      { root: track, threshold: RATIO_STEPS },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [trackRef]);

  const scrollPage = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      track?.scrollBy({ left: direction * track.clientWidth, behavior: scrollBehavior() });
    },
    [trackRef],
  );

  // The track is `position: relative`, so offsetLeft is measured from its own edge.
  const scrollToIndex = useCallback(
    (index: number) => {
      const slide = trackRef.current?.children[index];
      if (slide instanceof HTMLElement) trackRef.current?.scrollTo({ left: slide.offsetLeft, behavior: scrollBehavior() });
    },
    [trackRef],
  );

  return { atStart, atEnd, active, scrollPage, scrollToIndex };
}
