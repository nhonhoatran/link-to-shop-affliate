import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminCollectionDto, AdminCollectionListItemDto, AdminOutfitListItemDto } from '@under30ss/shared';
import AdminCollectionListPage from '@/app/admin/(protected)/collections/page';
import AdminCollectionEditPage from '@/app/admin/(protected)/collections/[id]/page';
import AdminCollectionNewPage from '@/app/admin/(protected)/collections/new/page';
import { buildDeleteMessage } from '@/components/admin/collections/collection-delete-action';

const { adminGet, redirect } = vi.hoisted(() => ({
  adminGet: vi.fn(),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
}));
vi.mock('@/app/admin/_lib/admin-api', () => ({ adminGet }));
vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const listItem = (id: string, name: string): AdminCollectionListItemDto => ({
  id,
  slug: id,
  name,
  status: 'published',
  order: 0,
  outfitCount: 2,
  coverImageUrl: `/media/${id}.webp`,
  updatedAt: '2026-11-05T20:00:00.000Z',
});
const collection: AdminCollectionDto = {
  id: 'c1',
  slug: 'streetwear',
  name: 'Streetwear',
  status: 'published',
  order: 0,
  coverImage: { key: 'k', url: '/media/k.webp', width: 10, height: 10 },
  usage: { outfitCount: 2, usedInDraft: true, usedInPublished: false },
};
const outfit: AdminOutfitListItemDto = {
  id: 'o1',
  slug: 'o1',
  title: 'Outfit A',
  status: 'published',
  featured: false,
  updatedAt: '2026-11-05T20:00:00.000Z',
  modelImageUrl: '/media/o1.webp',
};

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
  vi.stubEnv('ADMIN_TIME_ZONE', 'Asia/Ho_Chi_Minh');
});

beforeEach(() => {
  adminGet.mockReset();
  redirect.mockClear();
});

const searchParams = (params: Record<string, string | string[] | undefined> = {}) => Promise.resolve(params);

describe('admin collection list page', () => {
  beforeEach(() => adminGet.mockResolvedValue({ items: [listItem('a', 'Streetwear')], total: 41, page: 2, size: 20 }));

  it('passes q, status and page to the API and renders the server list', async () => {
    render(await AdminCollectionListPage({ searchParams: searchParams({ q: ' áo ', status: 'draft', page: '2' }) }));
    expect(adminGet).toHaveBeenCalledWith('/api/admin/collections?page=2&q=%C3%A1o&status=draft');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Tạo bộ sưu tập' })).toHaveAttribute('href', '/admin/collections/new');
    expect(screen.getByRole('link', { name: 'Streetwear' })).toHaveAttribute('href', '/admin/collections/a');
    expect(screen.getByText('Trang 2 / 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/admin/collections?q=%C3%A1o&status=draft&page=3');
  });

  it('offers reorder buttons only when no filter is active', async () => {
    render(await AdminCollectionListPage({ searchParams: searchParams({ page: '2' }) }));
    expect(adminGet).toHaveBeenCalledWith('/api/admin/collections?page=2');
    expect(screen.getByRole('button', { name: 'Chuyển Streetwear lên' })).toBeInTheDocument();
  });

  it('explains why reorder is hidden while filtering', async () => {
    render(await AdminCollectionListPage({ searchParams: searchParams({ q: 'x' }) }));
    expect(screen.queryByRole('button', { name: /Chuyển/ })).toBeNull();
    expect(screen.getByText('Bỏ bộ lọc để đổi thứ tự bộ sưu tập.')).toBeInTheDocument();
  });
});

describe('admin collection new page', () => {
  it('renders the create form under one h1', () => {
    render(<AdminCollectionNewPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Tạo bộ sưu tập' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tên bộ sưu tập')).toBeInTheDocument();
  });
});

describe('admin collection edit page', () => {
  const respond = (outfits: { items: AdminOutfitListItemDto[]; total: number; page: number }) =>
    adminGet.mockImplementation(async (path: string) =>
      path.startsWith('/api/admin/collections/') ? collection : { ...outfits, size: 20 },
    );

  it('loads the collection and its outfits page (op param) and renders form, panel and delete', async () => {
    respond({ items: [outfit], total: 41, page: 2 });
    render(await AdminCollectionEditPage({ params: Promise.resolve({ id: 'c1' }), searchParams: searchParams({ op: '2' }) }));
    expect(adminGet).toHaveBeenCalledWith('/api/admin/collections/c1');
    expect(adminGet).toHaveBeenCalledWith('/api/admin/outfits?collectionId=c1&page=2');
    expect(screen.getByRole('heading', { level: 1, name: 'Streetwear' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tên bộ sưu tập')).toHaveValue('Streetwear');
    expect(screen.getByRole('link', { name: 'Outfit A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('href', '/admin/collections/c1');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/admin/collections/c1?op=3');
    expect(screen.getByRole('button', { name: 'Xoá bộ sưu tập' })).toBeInTheDocument();
  });

  it('redirects to the new last page when the outfit page is past the end', async () => {
    respond({ items: [], total: 41, page: 9 });
    await expect(
      AdminCollectionEditPage({ params: Promise.resolve({ id: 'c1' }), searchParams: searchParams({ op: '9' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/admin/collections/c1?op=3');
  });

  it('shows the usage consequences in the delete dialog text', async () => {
    const user = userEvent.setup();
    respond({ items: [outfit], total: 1, page: 1 });
    render(await AdminCollectionEditPage({ params: Promise.resolve({ id: 'c1' }), searchParams: searchParams() }));
    await user.click(screen.getByRole('button', { name: 'Xoá bộ sưu tập' }));
    expect(screen.getByText(/Đang có 2 outfit/)).toBeInTheDocument();
    expect(screen.getByText(/Khối dùng bộ sưu tập này ở trang chủ sẽ tự ẩn/)).toBeInTheDocument();
  });
});

describe('buildDeleteMessage', () => {
  it('skips the homepage warning when no layout uses the collection', () => {
    const text = buildDeleteMessage('X', { outfitCount: 0, usedInDraft: false, usedInPublished: false });
    expect(text).toContain('chưa có outfit');
    expect(text).not.toContain('trang chủ');
  });

  it('warns when only the published layout uses it', () => {
    expect(buildDeleteMessage('X', { outfitCount: 1, usedInDraft: false, usedInPublished: true })).toContain('trang chủ');
  });
});
