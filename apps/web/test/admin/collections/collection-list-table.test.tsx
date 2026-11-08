import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminCollectionListItemDto } from '@under30ss/shared';
import { CollectionListTable } from '@/components/admin/collections/collection-list-table';
import { CollectionPagination } from '@/components/admin/collections/collection-pagination';
import { buildCollectionListHref, parseCollectionListQuery } from '@/components/admin/collections/collection-list-query';
import { jsonResponse } from '../admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  router.refresh.mockReset();
  router.replace.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const row = (id: string, name: string, status: 'draft' | 'published' = 'published'): AdminCollectionListItemDto => ({
  id,
  slug: id,
  name,
  status,
  order: 0,
  outfitCount: 3,
  coverImageUrl: status === 'published' ? `/media/${id}.webp` : null,
  updatedAt: '2026-11-05T20:00:00.000Z',
});
const items = [row('a', 'Streetwear'), row('b', 'Đi làm', 'draft'), row('c', 'Mùa hè')];

describe('CollectionListTable', () => {
  it('renders name links, status badges and outfit counts', () => {
    render(<CollectionListTable items={items} page={1} totalPages={1} canReorder />);
    expect(screen.getByRole('link', { name: 'Streetwear' })).toHaveAttribute('href', '/admin/collections/a');
    expect(screen.getByText('Bản nháp')).toBeInTheDocument();
    expect(screen.getAllByText('3')).toHaveLength(3);
  });

  it('hides Lên on the first row and Xuống on the last row of the whole list', () => {
    render(<CollectionListTable items={items} page={1} totalPages={1} canReorder />);
    expect(screen.queryByRole('button', { name: 'Chuyển Streetwear lên' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Chuyển Streetwear xuống' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chuyển Mùa hè lên' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chuyển Mùa hè xuống' })).toBeNull();
  });

  it('keeps both directions on page edges when other pages exist', () => {
    render(<CollectionListTable items={items} page={2} totalPages={3} canReorder />);
    expect(screen.getByRole('button', { name: 'Chuyển Streetwear lên' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chuyển Mùa hè xuống' })).toBeInTheDocument();
  });

  it('offers no reorder buttons while a filter is active', () => {
    render(<CollectionListTable items={items} page={1} totalPages={1} canReorder={false} />);
    expect(screen.queryByRole('button', { name: /Chuyển/ })).toBeNull();
  });

  it('shows one empty row when nothing matches', () => {
    render(<CollectionListTable items={[]} page={1} totalPages={1} canReorder />);
    expect(screen.getByText('Chưa có bộ sưu tập nào khớp.')).toBeInTheDocument();
  });

  it('posts the direction and refreshes the server list', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<CollectionListTable items={items} page={1} totalPages={1} canReorder />);
    await user.click(screen.getByRole('button', { name: 'Chuyển Đi làm xuống' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/collections/b/move');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ direction: 'down' });
  });

  it('shows the API error next to the row instead of refreshing', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'CONFLICT', message: 'Không đổi được thứ tự' } }, 409));
    render(<CollectionListTable items={items} page={1} totalPages={1} canReorder />);
    await user.click(screen.getByRole('button', { name: 'Chuyển Đi làm lên' }));
    await waitFor(() => expect(screen.getByText('Không đổi được thứ tự')).toBeInTheDocument());
    expect(router.refresh).not.toHaveBeenCalled();
  });
});

describe('collection list query and pagination', () => {
  it('parses leniently and builds hrefs that keep filters', () => {
    const query = parseCollectionListQuery({ q: ' áo ', status: 'weird', page: '-2' });
    expect(query).toEqual({ q: 'áo', status: undefined, page: 1 });
    expect(buildCollectionListHref({ q: 'áo', status: 'draft', page: 1 }, 3)).toBe(
      '/admin/collections?q=%C3%A1o&status=draft&page=3',
    );
    expect(buildCollectionListHref(query, 1)).toBe('/admin/collections?q=%C3%A1o');
  });

  it('renders prev/next links from the given href builder', () => {
    render(<CollectionPagination page={2} totalPages={3} hrefForPage={(p) => `/x?p=${p}`} />);
    expect(screen.getByRole('link', { name: 'Trước' })).toHaveAttribute('href', '/x?p=1');
    expect(screen.getByRole('link', { name: 'Sau' })).toHaveAttribute('href', '/x?p=3');
    expect(screen.getByText('Trang 2 / 3')).toBeInTheDocument();
  });

  it('renders nothing for a single page', () => {
    const { container } = render(<CollectionPagination page={1} totalPages={1} hrefForPage={() => '/x'} />);
    expect(container).toBeEmptyDOMElement();
  });
});
