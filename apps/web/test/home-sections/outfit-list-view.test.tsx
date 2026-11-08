import { render, screen, within } from '@testing-library/react';
import { sampleHomeSections, sampleOutfitCards } from '@under30ss/shared/fixtures';
import type { HomeSectionOf, OutfitListTabData } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { OutfitListView } from '@/components/home-sections/outfit-list-view';

const base = sampleHomeSections.find((s): s is HomeSectionOf<'OutfitList'> => s.type === 'OutfitList');
if (!base) throw new Error('fixture missing OutfitList');

const renderList = (
  tabs: OutfitListTabData[],
  props: Partial<HomeSectionOf<'OutfitList'>['props']> = {},
) =>
  render(
    <OutfitListView
      section={{ ...base, props: { ...base.props, ...props }, data: { tabs } }}
      headingId="section-outfits"
      priority={false}
      siteUrl="https://shop.example.test"
      mode="public"
    />,
  );

const latest: OutfitListTabData = { key: 'latest', href: '/looks', items: sampleOutfitCards };

describe('OutfitListView', () => {
  it('renders a carousel with a view-all link for one tab and no tab group', () => {
    renderList([latest]);
    expect(screen.getByRole('heading', { level: 2, name: 'Outfit mới' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByRole('list', { name: 'Outfit mới' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute('href', '/looks');
    expect(screen.getByRole('button', { name: 'Xem outfit trước' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xem outfit sau' })).toBeEnabled();
  });

  it('renders a grid with the configured desktop columns', () => {
    const { container } = renderList([latest], { display: 'grid', columnsDesktop: 3 });
    const grid = container.querySelector('ul') as HTMLElement;
    expect(grid.style.getPropertyValue('--outfit-columns')).toBe('3');
    expect(screen.queryByRole('button', { name: 'Xem outfit sau' })).toBeNull();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(sampleOutfitCards.length);
  });

  it('puts several collections into radio tabs that are all present in the HTML', () => {
    renderList([
      { key: 'a', label: 'Mùa hè', href: '/collections/mua-he', items: sampleOutfitCards.slice(0, 2) },
      { key: 'b', label: 'Đi làm', href: '/collections/di-lam', items: sampleOutfitCards.slice(2) },
    ]);
    const group = screen.getByRole('radiogroup', { name: 'Outfit mới' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toBeChecked();
    expect(radios[1]).not.toBeChecked();
    expect(screen.getByRole('group', { name: 'Mùa hè' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Đi làm' })).toBeInTheDocument();
    const hrefs = screen.getAllByRole('link', { name: 'Xem tất cả' }).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/collections/mua-he', '/collections/di-lam']);
  });

  it('has no view-all link when a tab has no href or the option is off', () => {
    const { unmount } = renderList([{ key: 'manual', items: sampleOutfitCards }], { source: 'manual' });
    expect(screen.queryByRole('link', { name: 'Xem tất cả' })).toBeNull();
    unmount();
    renderList([latest], { showViewAll: false });
    expect(screen.queryByRole('link', { name: 'Xem tất cả' })).toBeNull();
  });

  it('falls back to the looks page for the latest list when the API sends no href', () => {
    renderList([{ key: 'latest', items: sampleOutfitCards }]);
    expect(screen.getByRole('link', { name: 'Xem tất cả' })).toHaveAttribute('href', '/looks');
  });

  it('renders nothing when there are no outfits', () => {
    const { container } = renderList([{ key: 'latest', items: [] }]);
    expect(container).toBeEmptyDOMElement();
  });
});
