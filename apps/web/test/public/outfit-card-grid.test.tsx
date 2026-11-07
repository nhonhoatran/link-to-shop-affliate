import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OutfitCardGrid } from '@/components/public/outfit-card-grid';
import { OUTFIT_GRID_DESKTOP_COLUMNS } from '@/components/public/outfit-grid-columns';

const image = (key: string) => ({ key, url: `/media/${key}.webp`, width: 400, height: 1000 });
const items = [
  { slug: 'a', title: 'Alpha', modelImage: image('a'), updatedAt: '2026-11-01T00:00:00.000Z' },
  { slug: 'b b', title: 'Beta', modelImage: image('b'), updatedAt: '2026-11-01T00:00:00.000Z' },
];

describe('OutfitCardGrid', () => {
  it('renders one list item per outfit linking to its look page with the title as the heading', () => {
    render(<OutfitCardGrid items={items} headingLevel="h2" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 2, name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beta' })).toHaveAttribute('href', '/look/b%20b');
  });

  it('uses the requested heading level', () => {
    render(<OutfitCardGrid items={items} headingLevel="h3" />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
  });

  it('keeps the link name to the title only (image is decorative)', () => {
    const { container } = render(<OutfitCardGrid items={items} headingLevel="h2" />);
    const images = [...container.querySelectorAll('img')];
    expect(images).toHaveLength(2);
    expect(images.every((img) => img.getAttribute('alt') === '')).toBe(true);
  });

  it('loads only the first row eagerly and raises its priority on request', () => {
    const many = Array.from({ length: OUTFIT_GRID_DESKTOP_COLUMNS + 2 }, (_, i) => ({
      slug: `s${i}`,
      title: `T${i}`,
      modelImage: image(`s${i}`),
      updatedAt: '2026-11-01T00:00:00.000Z',
    }));
    const { container } = render(<OutfitCardGrid items={many} headingLevel="h2" highPriorityFirstRow />);
    const images = [...container.querySelectorAll('img')];
    images.forEach((img, i) => {
      const first = i < OUTFIT_GRID_DESKTOP_COLUMNS;
      expect(img.getAttribute('loading')).toBe(first ? 'eager' : 'lazy');
      expect(img.getAttribute('fetchpriority')).toBe(first ? 'high' : null);
    });
  });
});
