import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutfitEditor } from '@/components/admin/outfit-editor';
import { jsonResponse, makeAdminOutfit } from './admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/admin/outfits/outfit-1',
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  router.push.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const invalidRows = (container: HTMLElement) => Array.from(container.querySelectorAll('li[data-invalid]'));

describe('OutfitEditor: publish without a link', () => {
  const withoutLink = () =>
    makeAdminOutfit((outfit) => {
      outfit.items[2]!.affiliateUrl = '';
    });

  it('blocks publishing, marks only the offending item and shows its message', async () => {
    const user = userEvent.setup();
    const { container } = render(<OutfitEditor initial={withoutLink()} />);

    await user.click(screen.getByRole('button', { name: 'Đăng' }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa đăng được');
    const rows = invalidRows(container);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Giay sneaker');

    const link = screen.getByLabelText('Link affiliate');
    expect(link).toHaveAttribute('aria-invalid', 'true');
    expect(link).toHaveValue('');
    const errorId = link.getAttribute('aria-describedby')!.split(' ').find((id) => id.endsWith('-error'))!;
    expect(document.getElementById(errorId)).toHaveTextContent('Thiếu link affiliate');
  });

  it('flags a missing anchor on the right item as well', async () => {
    const user = userEvent.setup();
    const outfit = makeAdminOutfit((o) => {
      delete o.items[4]!.anchor;
    });
    const { container } = render(<OutfitEditor initial={outfit} />);

    await user.click(screen.getByRole('button', { name: 'Đăng' }));

    const rows = invalidRows(container);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Day chuyen bac');
    expect(screen.getByText('Chưa đặt điểm trên người mẫu')).toBeInTheDocument();
  });

  it('puts server field errors (items.<i>.affiliateUrl) on the same item', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', fields: { 'items.4.affiliateUrl': 'Link sai' } } },
        400,
      ),
    );
    const { container } = render(<OutfitEditor initial={makeAdminOutfit()} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(invalidRows(container)).toHaveLength(1));
    expect(invalidRows(container)[0]).toHaveTextContent('Day chuyen bac');
    expect(screen.getByLabelText('Link affiliate')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Link sai')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Dữ liệu không hợp lệ');
  });

  it('publishes when every item has link and anchor', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<OutfitEditor initial={makeAdminOutfit()} />);

    await user.click(screen.getByRole('button', { name: 'Đăng' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ẩn' })).toBeInTheDocument());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/admin/outfits/outfit-1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body).status).toBe('published');
    expect(screen.getByRole('link', { name: 'Xem trang' })).toHaveAttribute('target', '_blank');
  });
});

describe('OutfitEditor: unsaved changes', () => {
  it('starts with no save text, then asks before following an in-app link when dirty', async () => {
    const user = userEvent.setup();
    render(
      <>
        <a href="/admin/settings">Cài đặt</a>
        <OutfitEditor initial={makeAdminOutfit()} />
      </>,
    );
    expect(screen.getAllByRole('status').some((el) => el.textContent === 'Đã lưu')).toBe(false);

    await user.click(screen.getByRole('link', { name: 'Cài đặt' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Tên outfit'), '!');
    expect(screen.getAllByRole('status').some((el) => el.textContent === 'Có thay đổi chưa lưu')).toBe(true);

    await user.click(screen.getByRole('link', { name: 'Cài đặt' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Rời trang khi chưa lưu?')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Rời trang' }));
    expect(router.push).toHaveBeenCalledWith('/admin/settings');
  });

  it('stays on the page when the person cancels', async () => {
    const user = userEvent.setup();
    render(
      <>
        <a href="/admin/settings">Cài đặt</a>
        <OutfitEditor initial={makeAdminOutfit()} />
      </>,
    );
    await user.type(screen.getByLabelText('Tên outfit'), '!');
    await user.click(screen.getByRole('link', { name: 'Cài đặt' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ở lại' }));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('OutfitEditor: error tabs', () => {
  it('marks the tab holding the error and switches to it', async () => {
    const user = userEvent.setup();
    render(
      <OutfitEditor
        initial={makeAdminOutfit((outfit) => {
          outfit.items[2]!.affiliateUrl = '';
        })}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Đăng' }));

    expect(screen.getByRole('tab', { name: /Món đồ\s*\(có lỗi\)/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Thông tin' })).toBeInTheDocument();
    expect(screen.getByLabelText('Link affiliate')).toHaveFocus();
  });

  it('puts a title error on the info tab', async () => {
    const user = userEvent.setup();
    render(<OutfitEditor initial={makeAdminOutfit((outfit) => (outfit.title = ''))} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.getByRole('tab', { name: /Thông tin\s*\(có lỗi\)/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Tên outfit')).toHaveFocus();
  });
});

describe('OutfitEditor: collections', () => {
  const inCollections = (ids: string[]) => makeAdminOutfit((outfit) => (outfit.collectionIds = ids));
  const collectionBody = (name: string) => jsonResponse({ id: 'c1', slug: 'c1', name, status: 'published', order: 0, usage: {} });

  it('shows the current collections by name and does not send them when untouched', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(collectionBody('Streetwear')).mockResolvedValue(jsonResponse({}));
    render(<OutfitEditor initial={inCollections(['c1'])} />);

    const chips = await screen.findByRole('list', { name: 'Bộ sưu tập đã chọn' });
    await waitFor(() => expect(chips).toHaveTextContent('Streetwear'));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/collections/c1');

    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).not.toHaveProperty('collectionIds');
  });

  it('marks the editor unsaved after removing a collection and saves the new list', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(collectionBody('Streetwear')).mockResolvedValue(jsonResponse({}));
    render(<OutfitEditor initial={inCollections(['c1'])} />);

    await user.click(await screen.findByRole('button', { name: 'Bỏ Streetwear' }));
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]![1].method).toBe('PUT');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).collectionIds).toEqual([]);
    await waitFor(() => expect(screen.queryByText('Có thay đổi chưa lưu')).not.toBeInTheDocument());
  });

  it('does not call the collections API for an outfit without collections until the field is used', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [{ id: 'c9', name: 'Mùa hè', status: 'published', slug: 'm', order: 0, outfitCount: 0, coverImageUrl: null, updatedAt: '' }], total: 1, page: 1, size: 20 }),
    );
    render(<OutfitEditor initial={inCollections([])} />);
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText('Bộ sưu tập'));
    await user.click(await screen.findByRole('checkbox', { name: /Mùa hè/ }));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/collections?page=1&size=20');
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();
  });
});
