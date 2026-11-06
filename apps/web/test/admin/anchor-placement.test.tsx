import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnchorPlacementCanvas } from '@/components/admin/anchor-placement-canvas';
import { anchorFromPointer } from '@/components/admin/anchor-from-pointer';
import { fromAdminOutfit } from '@/hooks/admin/editor-state';
import { makeAdminOutfit } from './admin-outfit-fixture';

const rect = { left: 10, top: 20, width: 200, height: 400 };

describe('anchorFromPointer', () => {
  it('converts the pointer to percentages of the box', () => {
    expect(anchorFromPointer(110, 220, rect)).toEqual({ x: 50, y: 50 });
  });

  it('rounds to one decimal', () => {
    // (76.6667 - 10) / 200 * 100 = 33.33...
    expect(anchorFromPointer(10 + 200 * 0.33333, 20 + 400 * 0.66666, rect)).toEqual({ x: 33.3, y: 66.7 });
  });

  it('clamps points outside the box to 0..100', () => {
    expect(anchorFromPointer(-500, 9999, rect)).toEqual({ x: 0, y: 100 });
  });

  it('returns null for an empty box', () => {
    expect(anchorFromPointer(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toBeNull();
  });
});

describe('AnchorPlacementCanvas', () => {
  const state = fromAdminOutfit(
    makeAdminOutfit((outfit) => {
      delete outfit.items[1]!.anchor;
    }),
  );

  const setup = (selectedId: string | null) => {
    const onAnchor = vi.fn();
    const onSelect = vi.fn();
    render(
      <AnchorPlacementCanvas
        modelImage={state.modelImage}
        items={state.items}
        selectedId={selectedId}
        onSelect={onSelect}
        onAnchor={onAnchor}
      />,
    );
    const box = screen.getByTestId('anchor-canvas');
    box.getBoundingClientRect = () => ({ ...rect, right: 210, bottom: 420, x: 10, y: 20, toJSON: () => ({}) });
    return { box, onAnchor, onSelect };
  };

  it('sets the anchor of the selected item from a click on the model', () => {
    const { box, onAnchor } = setup('shorts');
    fireEvent.click(box, { clientX: 60, clientY: 120 });
    expect(onAnchor).toHaveBeenCalledWith('shorts', { x: 25, y: 25 });
  });

  it('does nothing on click when no item is selected', () => {
    const { box, onAnchor } = setup(null);
    fireEvent.click(box, { clientX: 60, clientY: 120 });
    expect(onAnchor).not.toHaveBeenCalled();
  });

  it('draws a dot only for items that have an anchor and selects it on press', () => {
    const { onSelect } = setup('shorts');
    expect(screen.getAllByRole('button', { name: /^Điểm của/ })).toHaveLength(state.items.length - 1);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Điểm của Ao thun in chu' }), { pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith('tee');
  });

  it('nudges a focused dot with the arrow keys', () => {
    const { onAnchor } = setup('tee');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Điểm của Ao thun in chu' }), { key: 'ArrowRight' });
    expect(onAnchor).toHaveBeenCalledWith('tee', { x: 39, y: 28 });
  });
});
