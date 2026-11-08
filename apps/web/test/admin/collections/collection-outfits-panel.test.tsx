import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminOutfitListItemDto } from '@under30ss/shared';
import { CollectionOutfitsPanel } from '@/components/admin/collections/collection-outfits-panel';
import { AdminToastContext } from '@/components/admin/shell/use-admin-toast';
import { jsonResponse } from '../admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const fetchMock = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };

beforeAll(() => {
  // jsdom lacks showModal/close on <dialog>.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

beforeEach(() => {
  fetchMock.mockReset();
  toast.success.mockReset();
  router.refresh.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const outfit = (id: string, title: string, status: 'draft' | 'published' = 'published'): AdminOutfitListItemDto => ({
  id,
  slug: id,
  title,
  status,
  featured: false,
  updatedAt: '2026-11-05T20:00:00.000Z',
  modelImageUrl: `/media/${id}.webp`,
});

const renderPanel = (items: AdminOutfitListItemDto[] = [outfit('o1', 'Outfit A'), outfit('o2', 'Outfit B', 'draft')]) =>
  render(
    <AdminToastContext.Provider value={toast}>
      <CollectionOutfitsPanel
        collectionId="c1"
        items={items}
        total={items.length}
        page={1}
        totalPages={1}
      />
    </AdminToastContext.Provider>,
  );

const searchResponse = () =>
  jsonResponse({
    items: [outfit('o3', 'Outfit C'), outfit('o4', 'Outfit D')],
    total: 2,
    page: 1,
    size: 20,
  });

describe('CollectionOutfitsPanel', () => {
  it('lists the assigned outfits with links and the total in the title', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Outfit trong bộ sưu tập (2)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Outfit A' })).toHaveAttribute('href', '/admin/outfits/o1');
  });

  it('shows the empty hint', () => {
    renderPanel([]);
    expect(screen.getByText(/Chưa có outfit nào/)).toBeInTheDocument();
  });

  it('removes one outfit without confirmation, toasts and refreshes', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Gỡ Outfit A khỏi bộ sưu tập' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/collections/c1/outfits/o1');
    expect(fetchMock.mock.calls[0]![1].method).toBe('DELETE');
    expect(toast.success).toHaveBeenCalledWith('Đã gỡ outfit khỏi bộ sưu tập');
  });

  it('shows a removal failure inline', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'NOT_FOUND', message: 'Outfit không còn trong bộ sưu tập' } }, 404));
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Gỡ Outfit A khỏi bộ sưu tập' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Outfit không còn trong bộ sưu tập'));
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('adds the ticked outfits in one request after searching on the server', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(searchResponse()).mockResolvedValueOnce(jsonResponse({}));
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Thêm outfit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Thêm outfit vào bộ sưu tập' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/outfits?page=1&size=20');
    const add = within(dialog).getByRole('button', { name: 'Thêm vào bộ sưu tập' });
    expect(add).toBeDisabled();

    await user.click(await within(dialog).findByRole('checkbox', { name: /Outfit C/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Outfit D/ }));
    await user.click(add);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/admin/collections/c1/outfits');
    expect(fetchMock.mock.calls[1]![1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ outfitIds: ['o3', 'o4'] });
    expect(toast.success).toHaveBeenCalledWith('Đã thêm 2 outfit vào bộ sưu tập');
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'));
  });

  it('keeps the dialog open and shows the error when adding fails', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(searchResponse())
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'VALIDATION', message: 'Có outfit không tồn tại' } }, 422));
    renderPanel();
    await user.click(screen.getByRole('button', { name: 'Thêm outfit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm outfit vào bộ sưu tập' });
    await user.click(await within(dialog).findByRole('checkbox', { name: /Outfit C/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Thêm vào bộ sưu tập' }));

    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('Có outfit không tồn tại'));
    expect(dialog).toHaveAttribute('open');
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
