import { render, waitFor } from '@testing-library/react';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import type { PublicOutfitDto } from '@under30ss/shared';
import { describe, expect, it, vi } from 'vitest';
import { LookbookLayout } from '@/components/lookbook';
import { measureConnectors } from '@/components/lookbook/measure-connectors';
import type * as MeasureModule from '@/components/lookbook/measure-connectors';

vi.mock('@/components/lookbook/measure-connectors', async (importOriginal) => {
  const actual = await importOriginal<typeof MeasureModule>();
  return { ...actual, measureConnectors: vi.fn(actual.measureConnectors) };
});

const measureCalls = () => vi.mocked(measureConnectors).mock.calls.length;
const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

describe('LookbookInteractions re-measure on DOM changes', () => {
  it('measures again when an anchor moves (hotspot style changes)', async () => {
    const { rerender } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    await settle();
    const before = measureCalls();
    const [first, ...rest] = samplePublicOutfit.items;
    const moved: PublicOutfitDto = {
      ...samplePublicOutfit,
      items: [{ ...first!, anchor: { x: first!.anchor.x + 5, y: first!.anchor.y + 5 } }, ...rest],
    };
    rerender(<LookbookLayout outfit={moved} />);
    await waitFor(() => expect(measureCalls()).toBeGreaterThan(before));
  });

  it('measures again when an item is removed and redraws one connector fewer', async () => {
    const { rerender, container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    await settle();
    const before = measureCalls();
    rerender(<LookbookLayout outfit={{ ...samplePublicOutfit, items: samplePublicOutfit.items.slice(1) }} />);
    await waitFor(() => expect(measureCalls()).toBeGreaterThan(before));
    await waitFor(() =>
      expect(container.querySelectorAll('svg path[data-item-id]')).toHaveLength(samplePublicOutfit.items.length - 1),
    );
  });

  it('does not keep measuring once the layout is idle', async () => {
    render(<LookbookLayout outfit={samplePublicOutfit} />);
    await settle();
    const settled = measureCalls();
    await settle();
    expect(measureCalls()).toBe(settled);
  });
});
