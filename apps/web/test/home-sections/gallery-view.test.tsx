import { render, screen } from '@testing-library/react';
import { sampleOutfitCards, sampleResolvedEditorialSections } from '@under30ss/shared/fixtures';
import type { HomeSectionOf, PublicOutfitCardDto } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { GalleryView } from '@/components/home-sections/gallery-view';

type GallerySection = HomeSectionOf<'Gallery'> & { data: { items: PublicOutfitCardDto[] } };

const base = sampleResolvedEditorialSections.find((s): s is GallerySection => s.type === 'Gallery');
if (!base) throw new Error('fixture missing Gallery');

const renderGallery = (items = base.data.items, priority = false) =>
  render(
    <GalleryView
      section={{ ...base, data: { items } }}
      headingId="section-gallery"
      priority={priority}
      siteUrl="https://shop.example.test"
      mode="public"
    />,
  );

const lookHref = (slug: string) => `/look/${encodeURIComponent(slug)}`;

describe('GalleryView', () => {
  it('shows the title, the note and one link per outfit to its look page, named by the outfit title', () => {
    renderGallery();
    expect(screen.getByRole('heading', { level: 2, name: base.props.title })).toBeInTheDocument();
    expect(screen.getByText(base.props.note!)).toBeInTheDocument();
    for (const outfit of sampleOutfitCards) {
      expect(screen.getByRole('link', { name: outfit.title })).toHaveAttribute('href', lookHref(outfit.slug));
    }
  });

  it('keeps the document order equal to the given order', () => {
    const { container } = renderGallery();
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(sampleOutfitCards.map((outfit) => lookHref(outfit.slug)));
  });

  it('prioritises only the first photo, and only for the LCP section', () => {
    const lazy = [...renderGallery(base.data.items, false).container.querySelectorAll('img')];
    expect(lazy.every((img) => img.getAttribute('loading') === 'lazy')).toBe(true);
    const { container } = renderGallery(base.data.items, true);
    const loading = [...container.querySelectorAll('img')].map((img) => img.getAttribute('loading'));
    expect(loading[0]).not.toBe('lazy');
    expect(loading.slice(1).every((value) => value === 'lazy')).toBe(true);
  });

  it('renders nothing without outfits', () => {
    const { container } = renderGallery([]);
    expect(container).toBeEmptyDOMElement();
  });
});
