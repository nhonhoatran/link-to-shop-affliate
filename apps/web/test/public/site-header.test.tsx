import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/components/motion/motion-provider';
import { SiteFooter } from '@/components/public/site-footer';
import { SiteHeader } from '@/components/public/site-header';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname }));

beforeEach(() => {
  usePathname.mockReset().mockReturnValue('/looks');
});

const renderHeader = () =>
  render(
    <MotionProvider>
      <SiteHeader siteName="Shop" />
    </MotionProvider>,
  );

describe('SiteHeader', () => {
  it('shows the brand and both nav links directly, marking the current page', () => {
    renderHeader();
    expect(screen.getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Tất cả outfit' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Trang chủ' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the header without a hiding transform', () => {
    const { container } = renderHeader();
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    expect(header?.getAttribute('style') ?? '').not.toMatch(/translateY\(-/);
  });
});

describe('SiteFooter', () => {
  it('has the site name, description, nav links and the current year', () => {
    render(<SiteFooter siteName="Shop" description="About text" />);
    expect(screen.getByText('About text')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tất cả outfit' })).toHaveAttribute('href', '/looks');
    expect(screen.getByText(`© ${new Date().getFullYear()} Shop`)).toBeInTheDocument();
  });
});
