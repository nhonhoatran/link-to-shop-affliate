import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedPhotoNav } from '@/components/feed/feed-photo-nav';

const PHOTO_WIDTH = 390;
const scrollTo = vi.fn();
let scrollLeft = 0;

/** A slide with `count` photos; the nav reads the track's scroll position from jsdom stubs. */
const renderSlide = (count: number) => {
  const view = render(
    <article data-feed-slide>
      <ul data-photo-track>
        {Array.from({ length: count }, (_, index) => (
          <li key={index} />
        ))}
      </ul>
      <FeedPhotoNav total={count} />
    </article>,
  );
  const track = view.container.querySelector<HTMLElement>('[data-photo-track]')!;
  track.scrollTo = scrollTo as unknown as typeof track.scrollTo;
  return { ...view, track };
};

/** Moves the track to photo `index` and fires the scroll event the nav listens to. */
const scrollToIndex = (track: HTMLElement, index: number) => {
  scrollLeft = index * PHOTO_WIDTH;
  fireEvent.scroll(track);
};

const dots = () => screen.getAllByRole('button', { name: /^Ảnh \d+\/\d+$/ });

beforeEach(() => {
  scrollTo.mockReset();
  scrollLeft = 0;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(PHOTO_WIDTH);
  vi.spyOn(HTMLElement.prototype, 'scrollLeft', 'get').mockImplementation(() => scrollLeft);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});

describe('FeedPhotoNav', () => {
  it('renders nothing for a single photo', () => {
    const { container } = renderSlide(1);
    expect(container.querySelector('[data-photo-track]')!.nextElementSibling).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ảnh kế tiếp' })).toBeNull();
  });

  it('shows one dot per photo and marks the photo on screen', () => {
    const { track } = renderSlide(3);
    expect(dots()).toHaveLength(3);
    expect(dots()[0]).toHaveAttribute('aria-current', 'true');

    scrollToIndex(track, 2);
    expect(dots()[0]).not.toHaveAttribute('aria-current');
    expect(dots()[2]).toHaveAttribute('aria-current', 'true');
  });

  it('scrolls the track to the photo of the dot that was pressed', () => {
    renderSlide(4);
    fireEvent.click(dots()[2]!);
    expect(scrollTo).toHaveBeenCalledWith({ left: 2 * PHOTO_WIDTH, behavior: 'auto' });
  });

  it('moves one photo with the arrows and disables the one that cannot move', () => {
    const { track } = renderSlide(3);
    const previous = screen.getByRole('button', { name: 'Ảnh trước' });
    const next = screen.getByRole('button', { name: 'Ảnh kế tiếp' });
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: PHOTO_WIDTH, behavior: 'auto' });

    scrollToIndex(track, 2);
    expect(next).toBeDisabled();
    expect(previous).toBeEnabled();
    fireEvent.click(previous);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: PHOTO_WIDTH, behavior: 'auto' });
  });

  it('scrolls smoothly unless the visitor asked for reduced motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    renderSlide(3);
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh kế tiếp' }));
    expect(scrollTo).toHaveBeenCalledWith({ left: PHOTO_WIDTH, behavior: 'smooth' });
  });

  it('shows dots up to 10 photos', () => {
    renderSlide(10);
    expect(dots()).toHaveLength(10);
    expect(screen.queryByText('1/10')).toBeNull();
  });

  it('swaps the dots for an i/n counter above 10 photos', () => {
    const { track } = renderSlide(11);
    expect(screen.queryAllByRole('button', { name: /^Ảnh \d+\/\d+$/ })).toHaveLength(0);
    expect(screen.getByText('1/11')).toBeInTheDocument();

    scrollToIndex(track, 4);
    expect(screen.getByText('5/11')).toBeInTheDocument();
  });
});
