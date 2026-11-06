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
