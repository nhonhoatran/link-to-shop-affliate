import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedAdminLayout from '@/app/admin/(protected)/layout';

const { getCurrentAdmin, getAdminSettings, cookieValues } = vi.hoisted(() => ({
  getCurrentAdmin: vi.fn(),
  getAdminSettings: vi.fn(),
  cookieValues: {} as Record<string, string>,
}));
vi.mock('@/app/admin/_lib/admin-api', () => ({ getCurrentAdmin, getAdminSettings }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name in cookieValues ? { value: cookieValues[name] } : undefined) }),
  headers: async () => ({ get: () => null }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

beforeEach(() => {
  for (const key of Object.keys(cookieValues)) delete cookieValues[key];
  getCurrentAdmin.mockReset().mockResolvedValue({ id: 'u1', email: 'admin@example.test', createdAt: '' });
  getAdminSettings.mockReset().mockResolvedValue({ siteName: 'Cửa hàng Mây', seoTitle: 't', seoDescription: '' });
});

describe('protected admin layout', () => {
  it('renders sidebar with site name, nav, account and logout, plus one main landmark', async () => {
    render(await ProtectedAdminLayout({ children: <h1>Nội dung</h1> }));
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveTextContent('Cửa hàng Mây');
    expect(sidebar).not.toHaveTextContent('Under30ss');
    expect(within(sidebar).getByRole('navigation', { name: 'Quản trị' })).toBeInTheDocument();
    expect(sidebar).toHaveTextContent('admin@example.test');
    expect(within(sidebar).getByRole('button', { name: 'Đăng xuất' })).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveTextContent('Nội dung');
    expect(screen.getByRole('link', { name: 'Bỏ qua tới nội dung' })).toHaveAttribute('href', '#admin-main');
  });

  it('marks the theme from the cookie as pressed, defaulting to system', async () => {
    const { unmount } = render(await ProtectedAdminLayout({ children: null }));
    const group = () => within(screen.getByRole('complementary')).getByRole('group', { name: 'Giao diện' });
    expect(within(group()).getByRole('button', { name: 'Theo hệ thống' })).toHaveAttribute('aria-pressed', 'true');
    unmount();

    cookieValues['admin-theme'] = 'dark';
    render(await ProtectedAdminLayout({ children: null }));
    expect(within(group()).getByRole('button', { name: 'Tối' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group()).getByRole('button', { name: 'Sáng' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('puts the remembered sidebar state on the frame and offers the opposite action', async () => {
    cookieValues['admin-sidebar'] = 'rail';
    const { container } = render(await ProtectedAdminLayout({ children: null }));
    expect(container.querySelector('[data-sidebar="rail"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Mở rộng menu' })).toHaveAttribute('value', 'expanded');
  });

  it('has a mobile drawer trigger in the topbar banner', async () => {
    render(await ProtectedAdminLayout({ children: null }));
    const banner = screen.getByRole('banner');
    expect(banner).toHaveTextContent('Cửa hàng Mây');
    expect(within(banner).getByRole('button', { name: 'Mở menu' })).toBeInTheDocument();
  });
});
