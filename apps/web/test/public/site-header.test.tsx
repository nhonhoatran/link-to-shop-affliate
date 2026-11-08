import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/components/motion/motion-provider';
import { buildPublicNavItems, type NavSettings } from '@/components/public/public-nav-items';
import { SiteHeader } from '@/components/public/site-header';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname }));

beforeEach(() => {
  usePathname.mockReset().mockReturnValue('/looks');
});

const renderHeader = (navSettings: NavSettings = {}) =>
  render(
    <MotionProvider>
      <SiteHeader siteName="Shop" navItems={buildPublicNavItems(navSettings)} />
    </MotionProvider>,
  );

describe('SiteHeader', () => {
  it('shows the brand and both nav links directly, marking the current page', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Tất cả outfit' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('adds the collections link with the configured label when it is visible', () => {
    renderHeader({ collectionsNavVisible: true, collectionsLabel: 'Bộ sưu tập hè' });
    expect(screen.getByRole('link', { name: 'Bộ sưu tập hè' })).toHaveAttribute('href', '/collections');
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('falls back to the default label, and hides the link when the nav is not visible', () => {
    const { unmount } = renderHeader({ collectionsNavVisible: true });
    expect(screen.getByRole('link', { name: 'Bộ sưu tập' })).toBeInTheDocument();
    unmount();
    renderHeader({ collectionsNavVisible: false, collectionsLabel: 'Bộ sưu tập' });
    expect(screen.queryByRole('link', { name: 'Bộ sưu tập' })).toBeNull();
  });

  it('keeps the collections link current on a collection detail page', () => {
    usePathname.mockReturnValue('/collections/summer');
    renderHeader({ collectionsNavVisible: true });
    expect(screen.getByRole('link', { name: 'Bộ sưu tập' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
  });

  it('only matches the home link on the exact path', () => {
    usePathname.mockReturnValue('/');
    renderHeader({ collectionsNavVisible: true });
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Bộ sưu tập' })).not.toHaveAttribute('aria-current');
  });

  it('renders the header without a hiding transform', () => {
    const { container } = renderHeader();
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.getAttribute('style') ?? '').not.toMatch(/translateY\(-/);
  });
});
