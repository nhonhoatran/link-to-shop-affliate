import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import type { PublicOutfitDto } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { LookbookLayout } from '@/components/lookbook';

const card = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`a[data-item-id="${id}"]:not([data-hotspot])`)!;
const root = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-lookbook]')!;

describe('LookbookInteractions', () => {
  it('draws one connector path per item', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    expect(container.querySelectorAll('svg path[data-item-id]')).toHaveLength(samplePublicOutfit.items.length);
  });

  it('marks a card active on pointer hover and clears it on leave', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    fireEvent.pointerOver(card(container, 'bag'), { pointerType: 'mouse' });
    expect(root(container)).toHaveAttribute('data-active-id', 'bag');
    expect(card(container, 'bag')).toHaveAttribute('data-active');
    expect(screen.getByLabelText('Tui deo cheo')).toHaveAttribute('data-active');
    expect(card(container, 'tee')).not.toHaveAttribute('data-active');
    expect(container.querySelector('svg path[data-item-id="bag"]')).toHaveAttribute('data-active');

    fireEvent.pointerOut(card(container, 'bag'), { pointerType: 'mouse', relatedTarget: document.body });
    expect(root(container)).not.toHaveAttribute('data-active-id');
    expect(card(container, 'bag')).not.toHaveAttribute('data-active');
  });

  it('marks the hovered hotspot item active (hotspot to card)', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    fireEvent.pointerOver(screen.getByLabelText('Giay sneaker'), { pointerType: 'mouse' });
    expect(card(container, 'sneakers')).toHaveAttribute('data-active');
  });

  it('ignores touch pointers so a tap does not leave a hover state', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    fireEvent.pointerOver(card(container, 'tee'), { pointerType: 'touch' });
    expect(root(container)).not.toHaveAttribute('data-active-id');
  });

  it('activates the matching card when a hotspot gets keyboard focus', async () => {
    const user = userEvent.setup();
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    const hotspot = screen.getByLabelText('Day chuyen bac');
    while (document.activeElement !== hotspot) {
      await user.tab();
      if (document.activeElement === document.body) throw new Error('hotspot never received focus');
    }
    expect(card(container, 'necklace')).toHaveAttribute('data-active');
    expect(root(container)).toHaveAttribute('data-active-id', 'necklace');

    await user.tab();
    expect(card(container, 'necklace')).not.toHaveAttribute('data-active');
  });

  it('activates the matching hotspot when a card gets keyboard focus', async () => {
    const user = userEvent.setup();
    render(<LookbookLayout outfit={samplePublicOutfit} />);
    await user.tab();
    expect(document.activeElement).toHaveAttribute('data-item-id', 'tee');
    expect(screen.getByLabelText('Ao thun in chu')).toHaveAttribute('data-active');
  });

  it('prevents navigation on a disabled link', () => {
    const first = samplePublicOutfit.items[0]!;
    const outfit: PublicOutfitDto = { ...samplePublicOutfit, items: [{ ...first, affiliateUrl: '' }] };
    const { container } = render(<LookbookLayout outfit={outfit} />);
    const notPrevented = fireEvent.click(card(container, first.id));
    expect(notPrevented).toBe(false);
  });

  it('does not prevent navigation on a real link', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    expect(fireEvent.click(card(container, 'tee'))).toBe(true);
  });
});
