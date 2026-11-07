import { act, render, waitFor } from '@testing-library/react';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LookbookLayout } from '@/components/lookbook';

const svgOf = (container: HTMLElement) => container.querySelector('svg')!;
const paths = (container: HTMLElement) => Array.from(container.querySelectorAll('svg path[data-item-id]'));

let imagesComplete = true;
let resizeCallbacks: ResizeObserverCallback[] = [];
let reducedMotion = false;

beforeEach(() => {
  imagesComplete = true;
  reducedMotion = false;
  resizeCallbacks = [];
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockImplementation(() => imagesComplete);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: ResizeObserverCallback) {
        resizeCallbacks.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reducedMotion : true,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('LookbookInteractions draw once', () => {
  it('keeps the threads hidden until the eager images have loaded', async () => {
    imagesComplete = false;
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(svgOf(container)).not.toHaveAttribute('data-ready');

    imagesComplete = true;
    const img = container.querySelector('img')!;
    await act(async () => {
      img.dispatchEvent(new Event('load'));
    });
    await waitFor(() => expect(svgOf(container)).toHaveAttribute('data-ready'));
  });

  it('becomes ready when an image fails to load', async () => {
    imagesComplete = false;
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(svgOf(container)).not.toHaveAttribute('data-ready');

    imagesComplete = true;
    const img = container.querySelector('img')!;
    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });
    await waitFor(() => expect(svgOf(container)).toHaveAttribute('data-ready'));
  });

  it('marks ready once and keeps the same path nodes through resize', async () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    await waitFor(() => expect(svgOf(container)).toHaveAttribute('data-ready'));
    const before = paths(container);
    expect(before.length).toBeGreaterThan(0);
    for (const p of before) expect(p).toHaveAttribute('pathLength', '1');

    await act(async () => {
      resizeCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
    });
    expect(svgOf(container)).toHaveAttribute('data-ready');
    const after = paths(container);
    expect(after).toHaveLength(before.length);
    after.forEach((node, i) => expect(node).toBe(before[i]));
  });

  it('adds arrowheads only after the draw ends', async () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    await waitFor(() => expect(svgOf(container)).toHaveAttribute('data-ready'));
    expect(paths(container)[0]).not.toHaveAttribute('marker-end');

    await act(async () => {
      svgOf(container).dispatchEvent(new Event('animationend', { bubbles: true }));
    });
    expect(paths(container)[0]).toHaveAttribute('marker-end');
  });

  it('shows arrowheads right away under reduced motion', async () => {
    reducedMotion = true;
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    await waitFor(() => expect(paths(container)[0]).toHaveAttribute('marker-end'));
  });

  it('staggers items left column first, then right column', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    const order = Array.from(container.querySelectorAll<HTMLElement>('[data-side] li')).map((li) =>
      li.style.getPropertyValue('--i'),
    );
    expect(order).toEqual(order.map((_, i) => String(i)));
  });
});
