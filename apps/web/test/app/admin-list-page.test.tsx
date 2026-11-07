import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminOutfitListPage from '@/app/admin/(protected)/outfits/page';

const { adminGet } = vi.hoisted(() => ({ adminGet: vi.fn() }));
vi.mock('@/app/admin/_lib/admin-api', () => ({ adminGet }));

const item = {
  id: 'o1',
  slug: 'a',
  title: 'Outfit A',
  status: 'published',
  featured: false,
  modelImageUrl: '/media/a.webp',
  updatedAt: '2026-11-05T20:00:00.000Z',
};

const renderPage = async (searchParams: Record<string, string | string[] | undefined>) =>
  render(await AdminOutfitListPage({ searchParams: Promise.resolve(searchParams) }));

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
  vi.stubEnv('ADMIN_TIME_ZONE', 'Asia/Ho_Chi_Minh');
});

beforeEach(() => {
  adminGet.mockReset().mockResolvedValue({ items: [item], total: 41, page: 2, size: 20 });
});

describe('admin outfit list page', () => {
  it('passes q, status and page from the URL to the API', async () => {
    await renderPage({ q: ' áo thun ', status: 'draft', page: '2' });
    expect(adminGet).toHaveBeenCalledTimes(1);
    expect(adminGet).toHaveBeenCalledWith('/api/admin/outfits?page=2&q=%C3%A1o+thun&status=draft');
  });

  it('asks for page 1 without filters when the URL has no params, and ignores bad values', async () => {
    await renderPage({});
    expect(adminGet).toHaveBeenLastCalledWith('/api/admin/outfits?page=1');
    await renderPage({ status: 'weird', page: '-3' });
    expect(adminGet).toHaveBeenLastCalledWith('/api/admin/outfits?page=1');
  });

  it('renders one h1, the rows, and shows dates in the configured admin time zone', async () => {
    await renderPage({ page: '2' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Outfit A' })).toHaveAttribute('href', '/admin/outfits/o1');
    // 20:00 UTC on 5 Nov is 03:00 on 6 Nov in Ho Chi Minh City.
    expect(screen.getByText(/\b6\/11\/26/)).toBeInTheDocument();
    expect(screen.getByText('Trang 2 / 3')).toBeInTheDocument();
  });
});
