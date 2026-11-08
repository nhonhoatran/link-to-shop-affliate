import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleNewsletterSubscribers } from '@under30ss/shared/fixtures';
import AdminNewsletterPage from '@/app/admin/(protected)/newsletter/page';

const { adminGet } = vi.hoisted(() => ({ adminGet: vi.fn() }));
vi.mock('@/app/admin/_lib/admin-api', () => ({ adminGet }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
  vi.stubEnv('ADMIN_TIME_ZONE', 'Asia/Ho_Chi_Minh');
});
beforeEach(() => {
  adminGet.mockReset();
  adminGet.mockResolvedValue({ items: sampleNewsletterSubscribers, total: 45, page: 2, size: 20 });
});

const params = (value: Record<string, string>) => Promise.resolve(value);

describe('admin newsletter page', () => {
  it('forwards q, status and page to the API and renders the server list', async () => {
    render(await AdminNewsletterPage({ searchParams: params({ q: ' khach ', status: 'unsubscribed', page: '2' }) }));
    const url = adminGet.mock.calls[0]![0] as string;
    expect(url.startsWith('/api/admin/newsletter?')).toBe(true);
    expect(Object.fromEntries(new URLSearchParams(url.split('?')[1]))).toEqual({
      page: '2',
      q: 'khach',
      status: 'unsubscribed',
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Đăng ký nhận tin' })).toBeInTheDocument();
    expect(screen.getByText('khach.a@example.test')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('khach');
  });

  it('links the export to the current filters and pages with filters kept', async () => {
    render(await AdminNewsletterPage({ searchParams: params({ q: 'khach', page: '2' }) }));
    expect(screen.getByRole('link', { name: 'Xuất CSV' })).toHaveAttribute('href', '/api/admin/newsletter/export?q=khach');
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('href', '/admin/newsletter?q=khach');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/admin/newsletter?q=khach&page=3');
  });
});
