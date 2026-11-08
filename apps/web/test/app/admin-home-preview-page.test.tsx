import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { sampleResolvedHomeSections } from '@under30ss/shared/fixtures';
import { API_PATHS } from '@under30ss/shared';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminHomePreviewPage, { metadata } from '@/app/admin/home-preview/page';

const { adminGet, getPublicSettings } = vi.hoisted(() => ({ adminGet: vi.fn(), getPublicSettings: vi.fn() }));
vi.mock('@/app/admin/_lib/admin-api', () => ({ adminGet }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getPublicSettings }));
// The real shell is an async server component that loads settings and navigation; this page only has to sit inside it.
vi.mock('@/components/public/public-shell', () => ({
  PublicShell: ({ children }: { children: ReactNode }) => <div data-testid="public-shell">{children}</div>,
}));

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

beforeEach(() => {
  adminGet.mockReset().mockResolvedValue({ sections: sampleResolvedHomeSections });
  getPublicSettings.mockReset().mockResolvedValue({ seoTitle: 'Shop title', seoDescription: 'Shop description' });
});

describe('/admin/home-preview', () => {
  it('reads the saved draft through the admin API', async () => {
    render(await AdminHomePreviewPage());
    expect(adminGet).toHaveBeenCalledWith(API_PATHS.admin.homePreview);
  });

  it('marks the page as an unpublished preview and links back to the editor', async () => {
    render(await AdminHomePreviewPage());
    expect(screen.getByRole('status')).toHaveTextContent('Bản xem trước, chưa đăng');
    expect(screen.getByRole('link', { name: 'Quay lại trình soạn thảo' })).toHaveAttribute('href', '/admin/home');
  });

  it('renders the sections inside the public shell without a page heading or structured data', async () => {
    const { container } = render(await AdminHomePreviewPage());
    expect(screen.getByTestId('public-shell')).toContainElement(screen.getByText('Mua hàng ở đâu?'));
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('stays out of search results', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('lets the login redirect from an expired session through', async () => {
    adminGet.mockRejectedValue(new Error('NEXT_REDIRECT:/admin/login'));
    await expect(AdminHomePreviewPage()).rejects.toThrow('NEXT_REDIRECT:/admin/login');
  });
});
