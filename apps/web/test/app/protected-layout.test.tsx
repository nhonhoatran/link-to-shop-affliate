import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedAdminLayout from '@/app/admin/(protected)/layout';

const { getCurrentAdmin, getAdminSettings } = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  getAdminSettings: vi.fn(),
}));
vi.mock('@/app/admin/_lib/admin-api', () => ({ getCurrentAdmin, getAdminSettings }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  getCurrentAdmin.mockReset().mockResolvedValue({ id: 'u1', email: 'admin@example.test', createdAt: '' });
  getAdminSettings.mockReset().mockResolvedValue({ siteName: 'Cửa hàng Mây', seoTitle: 't', seoDescription: '' });
});

describe('protected admin layout', () => {
  it('shows the site name from settings in the header, plus nav, account and logout', async () => {
    render(await ProtectedAdminLayout({ children: <h1>Nội dung</h1> }));
    const header = screen.getByRole('banner');
    expect(header).toHaveTextContent('Cửa hàng Mây');
    expect(header).not.toHaveTextContent('Under30ss');
    expect(screen.getByRole('navigation', { name: 'Quản trị' })).toBeInTheDocument();
    expect(header).toHaveTextContent('admin@example.test');
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('Nội dung');
  });
});
