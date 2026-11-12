import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedStepButtons } from '@/components/feed/feed-step-buttons';

const PHOTO_WIDTH = 390;
const slideTops = [0, 700];

/** Two slides, each with a 3-photo track, plus a form field and a dialog inside the scroller. */
const renderFeed = () => {
  const view = render(
    <div>
      <div data-feed tabIndex={0}>
        {slideTops.map((top) => (
          <article key={top} data-feed-slide data-top={top}>
            <ul data-photo-track>
              <li />
              <li />
              <li />
            </ul>
          </article>
        ))}
        <input aria-label="field" />
        <dialog aria-label="sheet">
          <button type="button">Đóng</button>
        </dialog>
      </div>
      <FeedStepButtons />
    </div>,
  );
  const scroller = view.container.querySelector<HTMLElement>('[data-feed]')!;
  const tracks = Array.from(scroller.querySelectorAll<HTMLElement>('[data-photo-track]'));
  const trackScrolls = tracks.map((track) => {
    const scrollTo = vi.fn();
    track.scrollTo = scrollTo as unknown as typeof track.scrollTo;
    return scrollTo;
  });
  scroller.querySelectorAll<HTMLElement>('[data-feed-slide]').forEach((slide) => {
    // A real rect moves up as the feed scrolls, so the stub subtracts the scroll offset.
    slide.getBoundingClientRect = () => ({ top: Number(slide.dataset.top) - scroller.scrollTop }) as DOMRect;
  });
  scroller.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
  return { scroller, trackScrolls };
};

/** Scrolls the feed to `top` so that slide becomes the one on screen. */
const scrollFeedTo = (scroller: HTMLElement, top: number) => {
  Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: top });
  fireEvent.scroll(scroller);
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(PHOTO_WIDTH);
  vi.spyOn(HTMLElement.prototype, 'scrollLeft', 'get').mockReturnValue(0);
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(1400);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
});

describe('FeedStepButtons photo keys', () => {
  it('moves the photo track of the slide on screen with ArrowRight and ArrowLeft', () => {
    const { trackScrolls } = renderFeed();
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(trackScrolls[0]).toHaveBeenLastCalledWith({ left: PHOTO_WIDTH, behavior: 'auto' });
    expect(trackScrolls[1]).not.toHaveBeenCalled();
  });

  it('targets the track of the slide the feed has scrolled to', () => {
    const { scroller, trackScrolls } = renderFeed();
    scrollFeedTo(scroller, 700);
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(trackScrolls[0]).not.toHaveBeenCalled();
    expect(trackScrolls[1]).toHaveBeenCalledWith({ left: PHOTO_WIDTH, behavior: 'auto' });
  });

  it('steps back with ArrowLeft and never moves before the first photo', () => {
    const { trackScrolls } = renderFeed();
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(trackScrolls[0]).toHaveBeenLastCalledWith({ left: 0, behavior: 'auto' });
  });

  it('ignores arrow keys with a modifier held', () => {
    const { trackScrolls } = renderFeed();
    fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(document.body, { key: 'ArrowRight', altKey: true });
    expect(trackScrolls[0]).not.toHaveBeenCalled();
  });

  it('ignores arrow keys typed into a form field', () => {
    const { trackScrolls } = renderFeed();
    fireEvent.keyDown(screen.getByLabelText('field'), { key: 'ArrowRight' });
    expect(trackScrolls[0]).not.toHaveBeenCalled();
  });

  it('ignores arrow keys pressed inside an open dialog', () => {
    const { trackScrolls } = renderFeed();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Đóng', hidden: true }), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByLabelText('sheet'), { key: 'ArrowLeft' });
    expect(trackScrolls[0]).not.toHaveBeenCalled();
  });

  it('does not change photos for a key the feed does not handle', () => {
    const { trackScrolls } = renderFeed();
    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(trackScrolls[0]).not.toHaveBeenCalled();
  });
});
