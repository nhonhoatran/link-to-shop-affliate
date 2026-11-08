import Link from 'next/link';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_PATHS } from '@under30ss/shared';
import { HomeEditorScreen } from '@/components/admin/home-editor/home-editor-screen';
import { jsonResponse } from '../admin-outfit-fixture';
import { adminHomeDto } from './home-editor-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const fetchMock = vi.fn();

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    String(url) === API_PATHS.admin.homePreview ? jsonResponse({ sections: [] }) : jsonResponse({}, 500),
  );
  router.push.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderScreen = (dto = adminHomeDto()) =>
  render(
    <>
      <Link href="/admin/outfits">Outfit</Link>
      <HomeEditorScreen initial={dto} siteUrl="https://shop.example.test" />
    </>,
  );

const saveCalls = () => fetchMock.mock.calls.filter(([url]) => String(url) !== API_PATHS.admin.homePreview);

describe('HomeEditorScreen', () => {
  it('opens the first section with an error and puts the cursor in the field to fix', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: '+ Thêm section' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Thêm section' })).getByRole('button', { name: /Chữ và ảnh/ }));
    await user.click(screen.getByRole('button', { name: 'Đăng' }));

    expect(saveCalls()).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent('Chưa lưu được: kiểm tra các mục báo lỗi.');
    expect(screen.getByText('Cần sửa')).toBeInTheDocument();
    const heading = screen.getByLabelText('Tiêu đề');
    expect(heading).toHaveAttribute('aria-invalid', 'true');
    expect(document.activeElement).toBe(heading);
  });

  it('offers to reload instead of overwriting when someone else saved first', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) =>
      String(url) === API_PATHS.admin.homePreview
        ? jsonResponse({ sections: [] })
        : jsonResponse({ error: { code: 'CONFLICT', message: 'Stale' } }, 409),
    );
    renderScreen();
    await user.click(screen.getAllByRole('switch')[0]!);
    await user.click(screen.getByRole('button', { name: 'Đăng' }));

    expect(await screen.findByText('Bố cục vừa được sửa ở nơi khác. Tải lại để xem bản mới nhất.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument();
    expect(screen.getAllByRole('switch')[0]).not.toBeChecked();
  });

  it('asks before leaving with edits that are not saved', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('link', { name: 'Outfit' }));
    expect(screen.queryByRole('dialog', { name: 'Rời trang khi chưa lưu?' })).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole('switch')[0]!);
    await user.click(screen.getByRole('link', { name: 'Outfit' }));
    const dialog = screen.getByRole('dialog', { name: 'Rời trang khi chưa lưu?' });
    await user.click(within(dialog).getByRole('button', { name: 'Ở lại' }));
    expect(router.push).not.toHaveBeenCalled();
    await user.click(screen.getByRole('link', { name: 'Outfit' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Rời trang khi chưa lưu?' })).getByRole('button', { name: 'Rời trang' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/outfits'));
  });

  it('shows the editing panel and the preview panel as two tabs on a narrow screen', async () => {
    const user = userEvent.setup();
    renderScreen();
    const edit = screen.getByRole('tab', { name: 'Chỉnh sửa' });
    expect(edit).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Xem trước' }));
    expect(screen.getByRole('tab', { name: 'Xem trước' })).toHaveAttribute('aria-selected', 'true');
  });
});
