'use client';

import { m, useMotionValueEvent, useScroll, type Transition } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { readMotionTransition } from './read-motion-tokens';

// Ignores sub-pixel and momentum jitter so the header does not flicker; not a business value.
const SCROLL_JITTER_PX = 4;

export function HideOnScrollHeader({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  // Server render and first paint are always visible, so the header shows without JavaScript.
  const [hidden, setHidden] = useState(false);
  const [transition, setTransition] = useState<Transition | undefined>(undefined);

  useEffect(() => setTransition(readMotionTransition()), []);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (Math.abs(y - previous) < SCROLL_JITTER_PX) return;
    setHidden(y > previous && y > (ref.current?.offsetHeight ?? 0));
  });

  return (
    <m.header
      ref={ref}
      className={className}
      initial={false}
      animate={{ y: hidden ? '-100%' : '0%' }}
      transition={transition}
      onFocusCapture={() => setHidden(false)}
    >
      {children}
    </m.header>
  );
}
