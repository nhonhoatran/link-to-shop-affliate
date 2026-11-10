import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { samplePublicOutfit } from '@under30ss/shared/fixtures';
import { loadFeedPage } from '@/lib/feed/load-feed-page-action';

const { getOutfitFeedPage } = vi.hoisted(() => ({ getOutfitFeedPage: vi.fn() }));

vi.mock('@/lib/seo/public-feed-loaders', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getOutfitFeedPage,
}));

beforeEach(() => {
  getOutfitFeedPage.mockReset().mockResolvedValue({ items: [samplePublicOutfit], total: 5, page: 2, size: 2 });
});

describe('loadFeedPage', () => {
  it('returns server-rendered slides for the batch and the next batch number', async () => {
    const batch = await loadFeedPage({ page: 2, size: 2, collection: 'streetwear' });
    expect(getOutfitFeedPage).toHaveBeenCalledWith(2, 2, 'streetwear');
    expect(batch.nextPage).toBe(3);
    render(<>{batch.slides}</>);
    expect(screen.getByRole('link', { name: samplePublicOutfit.title })).toHaveAttribute(
      'href',
      `/look/${samplePublicOutfit.slug}`,
    );
  });

  it('reports no next batch on the last page', async () => {
    getOutfitFeedPage.mockResolvedValue({ items: [samplePublicOutfit], total: 5, page: 3, size: 2 });
    expect((await loadFeedPage({ page: 3, size: 2 })).nextPage).toBeNull();
  });

  it.each([
    { page: 0, size: 2 },
    { page: -1, size: 2 },
    { page: 1.5, size: 2 },
    { page: Number.NaN, size: 2 },
    { page: 2, size: 0 },
    { page: 2, size: 2, collection: 'Bad Slug!' },
  ])(
    'rejects invalid input %j before calling the API',
    async (input) => {
      await expect(loadFeedPage(input)).rejects.toThrow('Invalid feed page request');
      expect(getOutfitFeedPage).not.toHaveBeenCalled();
    },
  );

  it('throws for an unknown collection', async () => {
    getOutfitFeedPage.mockResolvedValue(null);
    await expect(loadFeedPage({ page: 1, size: 2, collection: 'nope' })).rejects.toThrow('Feed collection not found');
  });
});
