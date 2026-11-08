import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminCollectionDto } from '@under30ss/shared';
import { CollectionForm } from '@/components/admin/collections/collection-form';
import { AdminToastContext } from '@/components/admin/shell/use-admin-toast';
import { jsonResponse } from '../admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/admin/collections' }));

const fetchMock = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };

beforeEach(() => {
  fetchMock.mockReset();
  toast.success.mockReset();
  Object.values(router).forEach((fn) => fn.mockReset());
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const cover = { key: 'public/c.webp', width: 800, height: 1000, url: '/media/public/c.webp' };
const existing = (overrides: Partial<AdminCollectionDto> = {}): AdminCollectionDto => ({
  id: 'c1',
  slug: 'streetwear',
  name: 'Streetwear',
  status: 'published',
  order: 0,
  coverImage: cover,
  usage: { outfitCount: 2, usedInDraft: false, usedInPublished: false },
  ...overrides,
});
const renderForm = (initial?: AdminCollectionDto) =>
  render(
    <AdminToastContext.Provider value={toast}>
      <CollectionForm {...(initial ? { initial } : {})} />
    </AdminToastContext.Provider>,
  );
const sentBody = () => JSON.parse(fetchMock.mock.calls[0]![1].body);

describe('CollectionForm (create)', () => {
  it('fills the slug from the name until the person edits the slug', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Tên bộ sưu tập'), 'Mùa hè');
    expect(screen.getByLabelText('Đường dẫn (slug)')).toHaveValue('mua-he');

    await user.clear(screen.getByLabelText('Đường dẫn (slug)'));
    await user.type(screen.getByLabelText('Đường dẫn (slug)'), 'summer');
    await user.type(screen.getByLabelText('Tên bộ sưu tập'), ' 2');
    expect(screen.getByLabelText('Đường dẫn (slug)')).toHaveValue('summer');
  });

  it('creates a draft without a cover, toasts and opens the edit page', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(existing({ id: 'new-id', status: 'draft' }), 201));
    renderForm();
    await user.type(screen.getByLabelText('Tên bộ sưu tập'), 'Đi làm');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/collections/new-id'));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/collections');
    expect(fetchMock.mock.calls[0]![1].method).toBe('POST');
    expect(sentBody()).toEqual({ slug: 'di-lam', name: 'Đi làm', status: 'draft' });
    expect(toast.success).toHaveBeenCalledWith('Đã tạo bộ sưu tập');
  });

  it('blocks publishing without a cover with an inline message on the cover field', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText('Tên bộ sưu tập'), 'Đi làm');
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'published');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById('collection-cover-error')).toHaveTextContent('Bộ sưu tập đã đăng cần ảnh bìa');
    expect(screen.getByLabelText('Ảnh bìa')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Ảnh bìa')).toHaveFocus();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows required-name error on the name field', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(screen.getByLabelText('Tên bộ sưu tập')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('CollectionForm (edit)', () => {
  it('shows the current cover, lets it be removed and saves without it as a draft', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(existing()));
    renderForm(existing());
    expect(screen.getByRole('img', { name: 'Ảnh bìa hiện tại' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bỏ ảnh bìa' }));
    expect(screen.queryByRole('img', { name: 'Ảnh bìa hiện tại' })).not.toBeInTheDocument();
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById('collection-cover-error')).toHaveTextContent('Bộ sưu tập đã đăng cần ảnh bìa');

    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'draft');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/collections/c1');
    expect(fetchMock.mock.calls[0]![1].method).toBe('PUT');
    expect(sentBody()).not.toHaveProperty('coverImage');
    await waitFor(() => expect(screen.getByText('Đã lưu')).toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith('Đã lưu bộ sưu tập');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('keeps the slug when the name changes', async () => {
    const user = userEvent.setup();
    renderForm(existing());
    await user.type(screen.getByLabelText('Tên bộ sưu tập'), ' 2');
    expect(screen.getByLabelText('Đường dẫn (slug)')).toHaveValue('streetwear');
  });

  it('puts an API field error (duplicate slug) on the slug field', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'CONFLICT', message: 'Đường dẫn đã tồn tại', fields: { slug: 'Đường dẫn đã tồn tại' } } }, 409),
    );
    renderForm(existing());
    await user.type(screen.getByLabelText('Tên bộ sưu tập'), '!');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(document.getElementById('collection-slug-error')).toHaveTextContent('Đường dẫn đã tồn tại'));
  });

  it('saves on Ctrl+S', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(existing()));
    renderForm(existing());
    await user.type(screen.getByLabelText('Tên bộ sưu tập'), '!');
    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
