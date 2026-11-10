import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedLoadMore } from '@/components/feed/feed-load-more';

const { loadFeedPage } = vi.hoisted(() => ({ loadFeedPage: vi.fn() }));
vi.mock('@/lib/feed/load-feed-page-action', () => ({ loadFeedPage }));

let trigger: () => void = () => undefined;

beforeEach(() => {
  loadFeedPage.mockReset();
  class FakeObserver {
    constructor(callback: IntersectionObserverCallback) {
      trigger = () => callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => vi.unstubAllGlobals());

const renderFeed = (nextPage: number | null) =>
  render(
    <div data-feed>
      <FeedLoadMore nextPage={nextPage} size={2} collection="streetwear" basePath="/looks" footer={<footer>End</footer>} />
    </div>,
  );

describe('FeedLoadMore', () => {
  it('links to the next batch for visitors without JavaScript and holds the footer back', () => {
    renderFeed(2);
    expect(screen.getByRole('link', { name: 'Xem tiếp' })).toHaveAttribute('href', '/looks?page=2');
    expect(screen.queryByText('End')).toBeNull();
  });

  it('shows only the footer when nothing is left to load', () => {
    renderFeed(null);
    expect(screen.getByText('End')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('loads the next batch when the marker scrolls near, then shows the footer after the last one', async () => {
    loadFeedPage.mockResolvedValue({ slides: <p>Batch two</p>, nextPage: null });
    renderFeed(2);
    await act(async () => trigger());
    await waitFor(() => expect(screen.getByText('Batch two')).toBeInTheDocument());
    expect(loadFeedPage).toHaveBeenCalledWith({ page: 2, size: 2, collection: 'streetwear' });
    expect(screen.getByText('End')).toBeInTheDocument();
  });

  it('loads the same batch only once when triggered twice at the same time', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    loadFeedPage.mockReturnValue(new Promise((r) => (resolve = r)));
    renderFeed(2);
    await act(async () => {
      trigger();
      trigger();
    });
    expect(loadFeedPage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải thêm outfit');
    await act(async () => resolve({ slides: <p>Done</p>, nextPage: null }));
  });

  it('offers a retry after a failure and loads on click without navigating', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadFeedPage.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ slides: <p>Back</p>, nextPage: null });
    renderFeed(2);
    await act(async () => trigger());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Không tải được'));
    await act(async () => {
      fireEvent.click(screen.getByRole('link'));
    });
    await waitFor(() => expect(screen.getByText('Back')).toBeInTheDocument());
    consoleError.mockRestore();
  });
});
