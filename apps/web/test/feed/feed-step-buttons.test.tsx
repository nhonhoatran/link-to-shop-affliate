import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedStepButtons } from '@/components/feed/feed-step-buttons';
import { nextFeedPage } from '@/lib/seo/public-feed-loaders';

const scrollTo = vi.fn();
const slideTops = [0, 700, 1400];

const renderFeed = () => {
  const view = render(
    <div>
      <div data-feed tabIndex={0}>
        {slideTops.map((top) => (
          <article key={top} data-feed-slide data-top={top} />
        ))}
        <input aria-label="field" />
      </div>
      <FeedStepButtons />
    </div>,
  );
  const scroller = view.container.querySelector<HTMLElement>('[data-feed]')!;
  scroller.scrollTo = scrollTo as unknown as typeof scroller.scrollTo;
  // jsdom has no layout: report each slide's top relative to a scroller at the origin.
  scroller.querySelectorAll<HTMLElement>('[data-feed-slide]').forEach((slide) => {
    slide.getBoundingClientRect = () => ({ top: Number(slide.dataset.top) }) as DOMRect;
  });
  scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  return scroller;
};

beforeEach(() => {
  scrollTo.mockReset();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(2100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
});

describe('FeedStepButtons', () => {
  it('has labelled buttons and starts with the up button disabled', () => {
    renderFeed();
    expect(screen.getByRole('button', { name: 'Outfit trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Outfit kế tiếp' })).toBeEnabled();
  });

  it('moves one slide down and, with reduced motion, without smooth scrolling', () => {
    renderFeed();
    fireEvent.click(screen.getByRole('button', { name: 'Outfit kế tiếp' }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 700, behavior: 'auto' });
  });

  it('steps with ArrowDown and PageDown from the page body', () => {
    renderFeed();
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    fireEvent.keyDown(document.body, { key: 'PageDown' });
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('ignores modified keys and typing in form fields', () => {
    renderFeed();
    fireEvent.keyDown(document.body, { key: 'ArrowDown', ctrlKey: true });
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'ArrowDown' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('does not scroll above the first slide', () => {
    renderFeed();
    fireEvent.keyDown(document.body, { key: 'ArrowUp' });
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe('nextFeedPage', () => {
  it('returns the following batch until every outfit has been served', () => {
    expect(nextFeedPage({ page: 1, size: 12, total: 25 })).toBe(2);
    expect(nextFeedPage({ page: 2, size: 12, total: 25 })).toBe(3);
    expect(nextFeedPage({ page: 3, size: 12, total: 25 })).toBeNull();
    expect(nextFeedPage({ page: 1, size: 12, total: 12 })).toBeNull();
    expect(nextFeedPage({ page: 1, size: 12, total: 0 })).toBeNull();
  });
});
