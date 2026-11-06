import { render, screen, within } from '@testing-library/react';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import type { PublicOutfitDto } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { LookbookLayout } from '@/components/lookbook';

const REL = 'sponsored nofollow noopener noreferrer';

describe('LookbookLayout', () => {
  it('renders every item as one card link and one hotspot with the same href/target/rel', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    for (const item of samplePublicOutfit.items) {
      const links = Array.from(container.querySelectorAll<HTMLAnchorElement>(`a[data-item-id="${item.id}"]`));
      expect(links).toHaveLength(2);
      for (const a of links) {
        expect(a).toHaveAttribute('href', item.affiliateUrl);
        expect(a).toHaveAttribute('target', '_blank');
        expect(a).toHaveAttribute('rel', REL);
      }
      expect(screen.getByLabelText(item.name)).toHaveAttribute('data-hotspot');
      expect(screen.getByRole('img', { name: item.name })).toBeInTheDocument();
    }
  });

  it('positions hotspots from the anchor percentages', () => {
    render(<LookbookLayout outfit={samplePublicOutfit} />);
    const tee = samplePublicOutfit.items[0]!;
    expect(screen.getByLabelText(tee.name)).toHaveStyle({ left: `${tee.anchor.x}%`, top: `${tee.anchor.y}%` });
  });

  it('puts items in the column of their side', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    const leftNames = within(container.querySelector<HTMLElement>('[data-side="left"]')!)
      .getAllByRole('heading')
      .map((h) => h.textContent);
    expect(leftNames).toEqual(['Ao thun in chu', 'Quan short jean rach', 'Giay sneaker']);
    expect(container.querySelectorAll('[data-side="right"] li')).toHaveLength(3);
  });

  it('uses h1 for the title and h2 for items by default', () => {
    render(<LookbookLayout outfit={samplePublicOutfit} />);
    expect(screen.getByRole('heading', { level: 1, name: samplePublicOutfit.title })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(6);
  });

  it('uses h2 for the title and h3 for items in preview mode', () => {
    render(<LookbookLayout outfit={samplePublicOutfit} headingLevel="h2" />);
    expect(screen.getByRole('heading', { level: 2, name: samplePublicOutfit.title })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(6);
  });

  it('renders an empty affiliate link as a disabled "#" link without target', () => {
    const first = samplePublicOutfit.items[0]!;
    const outfit: PublicOutfitDto = { ...samplePublicOutfit, items: [{ ...first, affiliateUrl: '' }] };
    const { container } = render(<LookbookLayout outfit={outfit} />);
    for (const a of container.querySelectorAll<HTMLAnchorElement>(`a[data-item-id="${first.id}"]`)) {
      expect(a).toHaveAttribute('href', '#');
      expect(a).toHaveAttribute('aria-disabled', 'true');
      expect(a).not.toHaveAttribute('target');
    }
  });

  it('reserves model image size from the DTO and draws the connector overlay as decorative', () => {
    const { container } = render(<LookbookLayout outfit={samplePublicOutfit} />);
    const model = screen.getByRole('img', { name: samplePublicOutfit.title });
    expect(model).toHaveAttribute('width', String(samplePublicOutfit.modelImage.width));
    expect(model).toHaveAttribute('height', String(samplePublicOutfit.modelImage.height));
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
