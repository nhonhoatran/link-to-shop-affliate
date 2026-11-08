import { act, fireEvent, render, screen } from '@testing-library/react';
import { sampleHomeSections } from '@under30ss/shared/fixtures';
import type { HomeSectionOf } from '@under30ss/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeroSliderView } from '@/components/home-sections/hero-slider-view';

const base = sampleHomeSections.find((s): s is HomeSectionOf<'HeroSlider'> => s.type === 'HeroSlider');
if (!base) throw new Error('fixture missing HeroSlider');

const scrollTo = vi.fn();
const setMotionAllowed = (allowed: boolean) => {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes('no-preference') ? allowed : !allowed,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
};

const renderSlider = (props: Partial<HomeSectionOf<'HeroSlider'>['props']> = {}, mode: 'public' | 'preview' = 'public') =>
  render(
    <HeroSliderView
      section={{ ...base, props: { ...base.props, ...props } }}
      headingId="section-hero"
      priority
      siteUrl="https://shop.example.test"
      mode={mode}
    />,
  );

const SECONDS = base.props.autoplaySeconds;
const tick = () => act(() => void vi.advanceTimersByTime(SECONDS * 1000));

beforeEach(() => {
  vi.useFakeTimers();
  scrollTo.mockReset();
  HTMLElement.prototype.scrollTo = scrollTo;
  HTMLElement.prototype.scrollBy = scrollTo;
  setMotionAllowed(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('HeroSliderView', () => {
  it('is a labelled carousel whose slides are numbered', () => {
    const { container } = renderSlider();
    const region = screen.getByRole('region', { name: 'Banner chính' });
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    const slides = container.querySelectorAll('[aria-roledescription="slide"]');
    expect([...slides].map((el) => el.getAttribute('aria-label'))).toEqual(['1 / 2', '2 / 2']);
    expect(screen.getByRole('heading', { level: 2, name: 'Bộ sưu tập mới' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Khám phá' })).toHaveAttribute('href', '/collections');
  });

  it('loads only the first image eagerly and gives the slide with a mobile image a picture source', () => {
    const { container } = renderSlider();
    const images = [...container.querySelectorAll('img')];
    expect(images.map((img) => img.getAttribute('loading'))).toEqual(['eager', 'lazy']);
    expect(images[0]?.getAttribute('fetchpriority')).toBe('high');
    const source = container.querySelector('source');
    expect(source?.getAttribute('media')).toBe('(max-width: 767px)');
    expect(source?.getAttribute('srcset')).toContain('hero-2-mobile');
  });

  it('advances by itself every configured interval', () => {
    renderSlider();
    tick();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('never starts a timer under prefers-reduced-motion', () => {
    setMotionAllowed(false);
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    renderSlider();
    tick();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('stops while hovered and while focus is inside', () => {
    const { container } = renderSlider();
    const root = container.querySelector("[tabindex=\"0\"]")?.parentElement as HTMLElement;
    fireEvent.mouseEnter(root);
    tick();
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.mouseLeave(root);
    fireEvent.focus(screen.getByRole('button', { name: 'Tới ảnh 2 / 2' }));
    tick();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('pauses and resumes from the pause button', () => {
    renderSlider();
    const pause = screen.getByRole('button', { name: 'Tạm dừng tự chuyển' });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(pause);
    expect(pause).toHaveAttribute('aria-pressed', 'true');
    tick();
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(pause);
    tick();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('stops while the tab is hidden', () => {
    renderSlider();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    tick();
    expect(scrollTo).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  });

  it('has no pause button when autoplay is off', () => {
    renderSlider({ autoplaySeconds: 0 });
    expect(screen.queryByRole('button', { name: 'Tạm dừng tự chuyển' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ảnh sau' })).toBeInTheDocument();
  });

  it('does not move by itself in the editor preview', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    renderSlider({}, 'preview');
    tick();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Tạm dừng tự chuyển' })).toBeNull();
  });

  it('shows no controls for a single slide', () => {
    renderSlider({ slides: base.props.slides.slice(0, 1) });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('scrolls to a slide from its dot', () => {
    renderSlider();
    fireEvent.click(screen.getByRole('button', { name: 'Tới ảnh 2 / 2' }));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });
});
