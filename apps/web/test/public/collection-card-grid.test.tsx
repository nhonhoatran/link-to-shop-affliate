import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sampleCollectionCards } from '@under30ss/shared/fixtures';
import { CollectionCardGrid } from '@/components/public/collection-card-grid';
import { collectionCardImageSizes } from '@/components/public/collection-card-image-sizes';

const many = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    ...sampleCollectionCards[0]!,
    slug: `c${i}`,
    name: `Bộ ${i}`,
  }));

describe('CollectionCardGrid', () => {
  it('renders one list item per collection linking to its page, with the name as the heading', () => {
    render(<CollectionCardGrid items={[{ ...sampleCollectionCards[0]!, slug: 'a b' }]} headingLevel="h2" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Streetwear' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Streetwear' })).toHaveAttribute('href', '/collections/a%20b');
  });

  it('uses the requested heading level and keeps the cover decorative', () => {
    const { container } = render(<CollectionCardGrid items={many(2)} headingLevel="h3" />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
    expect([...container.querySelectorAll('img')].every((img) => img.getAttribute('alt') === '')).toBe(true);
  });

  it.each([2, 4, 6])('passes %i desktop columns to CSS through variables', (columns) => {
    const { container } = render(<CollectionCardGrid items={many(1)} headingLevel="h2" columnsDesktop={columns} />);
    const grid = container.querySelector('ul')!;
    expect(grid.style.getPropertyValue('--collection-columns')).toBe(String(columns));
    expect(grid.style.getPropertyValue('--collection-columns-md')).toBe(String(Math.min(3, columns)));
  });

  it('defaults to 3 desktop columns', () => {
    const { container } = render(<CollectionCardGrid items={many(1)} headingLevel="h2" />);
    expect(container.querySelector('ul')!.style.getPropertyValue('--collection-columns')).toBe('3');
  });

  it('loads only the first row eagerly and raises its priority on request', () => {
    const { container } = render(
      <CollectionCardGrid items={many(5)} headingLevel="h2" columnsDesktop={3} highPriorityFirstRow />,
    );
    [...container.querySelectorAll('img')].forEach((img, i) => {
      const first = i < 3;
      expect(img.getAttribute('loading')).toBe(first ? 'eager' : 'lazy');
      expect(img.getAttribute('fetchpriority')).toBe(first ? 'high' : null);
    });
  });

  it('does not raise priority unless asked', () => {
    const { container } = render(<CollectionCardGrid items={many(2)} headingLevel="h2" />);
    expect([...container.querySelectorAll('img')].every((img) => img.getAttribute('fetchpriority') === null)).toBe(true);
  });
});

describe('collectionCardImageSizes', () => {
  it('derives the desktop slot width from the column count', () => {
    expect(collectionCardImageSizes(4)).toBe('(min-width: 1264px) 300px, (min-width: 1024px) 25vw, (min-width: 768px) 34vw, 50vw');
    expect(collectionCardImageSizes(2)).toContain('(min-width: 768px) 50vw');
  });
});
