'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import buttons from '@/components/public/public-button.module.css';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { HOME_SECTION_COPY } from './home-section-copy';
import styles from './hero-slider.module.css';
import { useScrollRail } from './use-scroll-rail';

interface HeroSliderAutoplayProps {
  label: string;
  count: number;
  /** 0 turns autoplay off. */
  seconds: number;
  /** False in the editor preview, where nothing should move by itself. */
  autoplay: boolean;
  /** One element per slide. */
  children: ReactNode;
}

type UserChoice = 'auto' | 'paused' | 'playing';

const MOTION_ALLOWED_QUERY = '(prefers-reduced-motion: no-preference)';

function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(MOTION_ALLOWED_QUERY);
    const sync = () => setAllowed(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return allowed;
}

function useTabVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  return visible;
}

export function HeroSliderAutoplay({ label, count, seconds, autoplay, children }: HeroSliderAutoplayProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { atStart, atEnd, active, scrollPage, scrollToIndex } = useScrollRail(trackRef);
  const [choice, setChoice] = useState<UserChoice>('auto');
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const motionAllowed = useMotionAllowed();
  const tabVisible = useTabVisible();

  const multiple = count > 1;
  const canAutoplay = autoplay && multiple && seconds > 0;
  // An explicit "play" click wins over hover and focus, otherwise the click itself would stop it again.
  const held = choice === 'playing' ? false : hovering || focused;
  const running = canAutoplay && motionAllowed && tabVisible && choice !== 'paused' && !held;

  const advanceRef = useRef(() => {});
  useEffect(() => {
    advanceRef.current = () => scrollToIndex(active >= count - 1 ? 0 : active + 1);
  });
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => advanceRef.current(), seconds * 1000);
    return () => clearInterval(timer);
  }, [running, seconds]);

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return (
    <div
      className={styles.root}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      <div ref={trackRef} className={styles.track} tabIndex={0} aria-label={label} aria-live={running ? 'off' : 'polite'}>
        {children}
      </div>
      {multiple ? (
        <>
          <button
            type="button"
            className={`${buttons.button} ${buttons.onDark} ${buttons.icon} ${styles.arrow} ${styles.previous}`}
            aria-label={HOME_SECTION_COPY.slider.previous}
            disabled={atStart}
            onClick={() => scrollPage(-1)}
          >
            <DecorativeIcon icon={ChevronLeft} />
          </button>
          <button
            type="button"
            className={`${buttons.button} ${buttons.onDark} ${buttons.icon} ${styles.arrow} ${styles.next}`}
            aria-label={HOME_SECTION_COPY.slider.next}
            disabled={atEnd}
            onClick={() => scrollPage(1)}
          >
            <DecorativeIcon icon={ChevronRight} />
          </button>
          <div className={styles.controls}>
            {canAutoplay ? (
              <button
                type="button"
                className={`${buttons.button} ${buttons.onDark} ${buttons.icon} ${styles.pause}`}
                aria-label={HOME_SECTION_COPY.slider.pause}
                aria-pressed={choice === 'paused'}
                onClick={() => setChoice(choice === 'paused' ? 'playing' : 'paused')}
              >
                <DecorativeIcon icon={choice === 'paused' ? Play : Pause} size={16} />
              </button>
            ) : null}
            <div className={styles.dots} role="group" aria-label={HOME_SECTION_COPY.slider.dots}>
              {Array.from({ length: count }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={styles.dotButton}
                  aria-label={HOME_SECTION_COPY.slider.goTo(index + 1, count)}
                  aria-current={index === active ? 'true' : undefined}
                  onClick={() => scrollToIndex(index)}
                >
                  <span className={styles.dot} />
                </button>
              ))}
            </div>
            <span className={styles.counter} aria-hidden="true">
              {HOME_SECTION_COPY.slider.counter(active + 1, count)}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
