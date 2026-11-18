import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImportTokensPage from '@/app/admin/(protected)/import-tokens/page';

const { adminGet } = vi.hoisted(() => ({ adminGet: vi.fn() }));
vi.mock('@/app/admin/_lib/admin-api', () => ({ adminGet }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/web-env', () => ({ getWebEnv: () => ({ SITE_URL: 'https://shop.example.test', ADMIN_TIME_ZONE: 'UTC' }) }));

beforeEach(() => {
  adminGet.mockReset();
  adminGet.mockResolvedValue({ items: [], total: 45, page: 2, size: 20 });
});

describe('import token admin page', () => {
  it('fetches a server page and renders the destination URL and draft-only permissions', async () => {
    render(await ImportTokensPage({ searchParams: Promise.resolve({ page: '2' }) }));
    expect(adminGet).toHaveBeenCalledWith('/api/admin/import-tokens?page=2');
    expect(screen.getByLabelText('URL website')).toHaveValue('https://shop.example.test');
    expect(screen.getByText(/Token chỉ được tải ảnh/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('href', '/admin/import-tokens');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/admin/import-tokens?page=3');
  });

  it('uses page one for an invalid page without fetching the entire list', async () => {
    render(await ImportTokensPage({ searchParams: Promise.resolve({ page: 'not-a-page' }) }));
    expect(adminGet).toHaveBeenCalledWith('/api/admin/import-tokens?page=1');
    expect(screen.getByRole('heading', { level: 1, name: 'Token nhập desktop' })).toBeInTheDocument();
  });
});
