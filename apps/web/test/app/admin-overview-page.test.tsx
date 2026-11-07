import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOverviewPage from '@/app/admin/(protected)/page';
import { OverviewContent } from '@/components/admin/overview/overview-content';

const { getAdminStats, redirect } = vi.hoisted(() => ({ getAdminStats: vi.fn(), redirect: vi.fn() }));
vi.mock('@/app/admin/_lib/admin-api', () => ({ getAdminStats }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirect(url);
    throw new Error('NEXT_REDIRECT');
  },
}));

const outfit = (overrides: Record<string, unknown> = {}) => ({
  id: 'o1',
  slug: 'a',
  title: 'Outfit A',
  status: 'published',
  featured: false,
  modelImageUrl: '/media/a.webp',
  updatedAt: '2026-11-05T20:00:00.000Z',
  ...overrides,
});

const stats = (overrides: Record<string, unknown> = {}) => ({
  counts: { total: 12, published: 8, draft: 4, publishedMissingAffiliate: 2, draftMissingAffiliate: 3 },
  featured: outfit({ id: 'f1', title: 'Nổi bật A', featured: true }),
  recent: [outfit(), outfit({ id: 'o2', title: 'Outfit B', status: 'draft' })],
  ...overrides,
});

const callPage = (searchParams: Record<string, string | string[] | undefined> = {}) =>
  AdminOverviewPage({ searchParams: Promise.resolve(searchParams) });

const renderPage = async () => {
  render(
    <>
      {await callPage()}
      {await OverviewContent()}
    </>,
  );
};

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
  vi.stubEnv('ADMIN_TIME_ZONE', 'Asia/Ho_Chi_Minh');
});

beforeEach(() => {
  redirect.mockReset();
  getAdminStats.mockReset().mockResolvedValue(stats());
});

describe('admin overview page', () => {
  it('shows counts with links to the filtered list and a create CTA', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Tổng quan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tạo outfit' })).toHaveAttribute('href', '/admin/outfits/new');
    expect(screen.getByRole('link', { name: /Tổng outfit/ })).toHaveTextContent('12');
    expect(screen.getByRole('link', { name: /Đã đăng/ })).toHaveAttribute('href', '/admin/outfits?status=published');
    expect(screen.getByRole('link', { name: /Bản nháp/ })).toHaveAttribute('href', '/admin/outfits?status=draft');
    expect(screen.getByText('Thiếu link affiliate').parentElement).toHaveTextContent('Bản nháp thiếu link: 3');
  });

  it('lists recent outfits with edit links and the featured outfit', async () => {
    await renderPage();
    expect(screen.getByRole('link', { name: 'Outfit B' })).toHaveAttribute('href', '/admin/outfits/o2');
    expect(screen.getByRole('region', { name: 'Outfit nổi bật' })).toHaveTextContent('Nổi bật A');
  });

  it('prompts to pick a featured outfit when there is none', async () => {
    getAdminStats.mockResolvedValue(stats({ featured: null, recent: [] }));
    await renderPage();
    expect(screen.getByText(/Chưa có outfit nổi bật/)).toBeInTheDocument();
    expect(screen.getByText('Chưa có outfit nào')).toBeInTheDocument();
  });

  it('redirects old list URLs to /admin/outfits keeping the query', async () => {
    await expect(callPage({ status: 'draft', q: 'áo', page: '2' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/admin/outfits?status=draft&q=%C3%A1o&page=2');
    expect(getAdminStats).not.toHaveBeenCalled();
  });

  it('does not redirect for unrelated params', async () => {
    await callPage({ utm: 'x' });
    expect(redirect).not.toHaveBeenCalled();
  });
});
