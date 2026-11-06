import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeLookbookChanges } from '@/components/lookbook/observe-lookbook-changes';

const setup = () => {
  const root = document.createElement('section');
  root.innerHTML = '<a data-hotspot style="left: 1%"></a><svg><path d="M0 0"></path></svg>';
  document.body.append(root);
  const svg = root.querySelector('svg')!;
  const onChange = vi.fn();
  const stop = observeLookbookChanges(root, svg, onChange);
  return { root, svg, onChange, stop };
};

const pause = () => new Promise((resolve) => setTimeout(resolve, 60));

describe('observeLookbookChanges', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fires once per frame when a hotspot moves, however many mutations happened', async () => {
    const { root, onChange, stop } = setup();
    const hotspot = root.querySelector<HTMLElement>('a')!;
    hotspot.style.left = '10%';
    hotspot.style.top = '20%';
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    await pause();
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });

  it('fires when a card is added or removed', async () => {
    const { root, onChange, stop } = setup();
    root.append(document.createElement('li'));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    root.lastElementChild!.remove();
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    stop();
  });

  it('ignores mutations inside the connector svg so drawing never retriggers itself', async () => {
    const { svg, onChange, stop } = setup();
    svg.querySelector('path')!.setAttribute('style', 'stroke: red');
    svg.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    await pause();
    expect(onChange).not.toHaveBeenCalled();
    stop();
  });

  it('stops after the returned cleanup runs', async () => {
    const { root, onChange, stop } = setup();
    stop();
    root.querySelector<HTMLElement>('a')!.style.left = '50%';
    await pause();
    expect(onChange).not.toHaveBeenCalled();
  });
});
