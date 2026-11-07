import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RelatedOutfitsSection } from '@/components/public/related-outfits-section';

const { getRelatedOutfits } = vi.hoisted(() => ({ getRelatedOutfits: vi.fn() }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getRelatedOutfits }));

const card = (slug: string) => ({
  slug,
  title: `Title ${slug}`,
  modelImage: { key: slug, url: `/media/${slug}.webp`, width: 400, height: 1000 },
  updatedAt: '2026-11-01T00:00:00.000Z',
});

beforeEach(() => {
  getRelatedOutfits.mockReset();
});

describe('RelatedOutfitsSection', () => {
  it('renders an h2, h3 cards and a link to all outfits', async () => {
    getRelatedOutfits.mockResolvedValue([card('a'), card('b')]);
    render(await RelatedOutfitsSection({ count: 8, excludeSlug: 'x' }));
    expect(getRelatedOutfits).toHaveBeenCalledWith('x', 8);
    expect(screen.getByRole('heading', { level: 2, name: 'Outfit khác' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute('href', '/looks');
  });

  it('renders nothing when there are no other outfits', async () => {
    getRelatedOutfits.mockResolvedValue([]);
    const { container } = render(await RelatedOutfitsSection({ count: 8 }));
    expect(container).toBeEmptyDOMElement();
  });

  it('swallows an API failure so the main page still renders', async () => {
    getRelatedOutfits.mockImplementation(async () => {
      throw new Error('api down');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { container } = render(await RelatedOutfitsSection({ count: 8 }));
    expect(container).toBeEmptyDOMElement();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
