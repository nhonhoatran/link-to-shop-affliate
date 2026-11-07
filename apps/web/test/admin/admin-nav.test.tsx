import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminNav } from '@/components/admin/admin-nav';

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: pathname }));

const current = () => screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page');

describe('AdminNav', () => {
  it('marks only Tổng quan on /admin', () => {
    pathname.mockReturnValue('/admin');
    render(<AdminNav />);
    expect(current().map((link) => link.textContent)).toEqual(['Tổng quan']);
  });

  it('marks Outfit for the list, new and edit routes', () => {
    for (const path of ['/admin/outfits', '/admin/outfits/new', '/admin/outfits/abc123']) {
      pathname.mockReturnValue(path);
      const { unmount } = render(<AdminNav />);
      expect(current().map((link) => link.textContent)).toEqual(['Outfit']);
      unmount();
    }
  });

  it('marks settings and users by prefix', () => {
    pathname.mockReturnValue('/admin/settings');
    const { unmount } = render(<AdminNav />);
    expect(current().map((link) => link.textContent)).toEqual(['Cài đặt']);
    unmount();
    pathname.mockReturnValue('/admin/users');
    render(<AdminNav />);
    expect(current().map((link) => link.textContent)).toEqual(['Quản trị viên']);
  });

  it('keeps each link readable by name (text is only hidden visually in rail mode)', () => {
    pathname.mockReturnValue('/admin');
    render(<AdminNav />);
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('href', '/admin/settings');
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('data-tip', 'Cài đặt');
  });

  it('accepts a different landmark label for the drawer', () => {
    pathname.mockReturnValue('/admin');
    render(<AdminNav label="Điều hướng quản trị" />);
    expect(screen.getByRole('navigation', { name: 'Điều hướng quản trị' })).toBeInTheDocument();
  });
});
