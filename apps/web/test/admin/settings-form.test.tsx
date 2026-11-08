import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminToastContext } from '@/components/admin/shell/use-admin-toast';
import { SettingsForm } from '@/components/admin/settings-form';
import { jsonResponse } from './admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/admin' }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  router.replace.mockReset();
  router.refresh.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const settings = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Desc',
  ogImage: { key: 'public/og.webp', width: 1200, height: 630, url: '/media/public/og.webp' },
};

describe('SettingsForm', () => {
  it('lets the person remove the share image and saves without it', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={settings} />);
    expect(screen.getByRole('img', { name: 'Ảnh chia sẻ hiện tại' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bỏ ảnh chia sẻ' }));
    expect(screen.queryByRole('img', { name: 'Ảnh chia sẻ hiện tại' })).not.toBeInTheDocument();
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).not.toHaveProperty('ogImage');
    await waitFor(() => expect(screen.getByText('Đã lưu')).toBeInTheDocument());
  });

  it('shows no save text before anything happened, and Đã lưu only after a save', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={settings} />);
    expect(screen.queryByText('Đã lưu')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status').every((el) => el.textContent === '')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(screen.getByText('Đã lưu')).toBeInTheDocument());
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the Save label while saving and reports progress only in the status line', async () => {
    const user = userEvent.setup();
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    render(<SettingsForm initial={settings} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Đang lưu…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled();
  });

  it('gives the upload limit its own number message instead of a character count', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={settings} />);

    await user.type(screen.getByLabelText('Giới hạn dung lượng ảnh tải lên (MB)'), '0');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    const input = screen.getByLabelText('Giới hạn dung lượng ảnh tải lên (MB)');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const errorId = input.getAttribute('aria-describedby')!.split(' ').find((id) => id.endsWith('-error'))!;
    expect(document.getElementById(errorId)).toHaveTextContent('Nhập số nguyên lớn hơn 0');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Chưa lưu được')).toBeInTheDocument();
  });

  it('shows a server error for the share image on the dropzone field', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', fields: { ogImage: 'Ảnh không hợp lệ' } } },
        400,
      ),
    );
    render(<SettingsForm initial={settings} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    const dropzone = await screen.findByLabelText('Ảnh chia sẻ (Facebook, Zalo)');
    expect(dropzone).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Ảnh không hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('Chưa lưu được')).toBeInTheDocument();
  });

  it('sends the person to the login page when the session has expired', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Hết phiên' } }, 401));
    render(<SettingsForm initial={settings} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login'));
  });

  it('sends the listing sizes as numbers and leaves blank ones out', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={settings} />);
    const pageSize = screen.getByLabelText('Số mục mỗi trang (Tất cả outfit và Bộ sưu tập)');
    expect(pageSize).toHaveAttribute('type', 'number');
    expect(pageSize).toHaveAttribute('min', '1');

    await user.type(pageSize, '12');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.looksPageSize).toBe(12);
    expect(body).not.toHaveProperty('relatedOutfitsCount');
  });

  it('shows the API ceiling error on the listing field', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', fields: { relatedOutfitsCount: 'Tối đa 48' } } },
        400,
      ),
    );
    render(<SettingsForm initial={{ ...settings, relatedOutfitsCount: 99 }} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    const input = await screen.findByLabelText('Số outfit trong mục Outfit khác');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Tối đa 48')).toBeInTheDocument();
  });

  it('raises a success toast whose text differs from the save status line', async () => {
    const user = userEvent.setup();
    const toast = { success: vi.fn(), error: vi.fn() };
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(
      <AdminToastContext.Provider value={toast}>
        <SettingsForm initial={settings} />
      </AdminToastContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Đã lưu cài đặt'));
  });
  it('defaults the collections menu link to on and sends a custom label only when typed', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={settings} />);
    const toggle = screen.getByRole('checkbox', { name: 'Hiện link Bộ sưu tập trên menu' });
    expect(toggle).toBeChecked();
    expect(screen.getByLabelText('Tên hiển thị')).toHaveAttribute('placeholder', 'Bộ sưu tập');

    await user.click(toggle);
    await user.type(screen.getByLabelText('Tên hiển thị'), 'Bộ sưu tập hè');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.collectionsNavEnabled).toBe(false);
    expect(body.collectionsLabel).toBe('Bộ sưu tập hè');
  });

  it('groups the fields into labelled sections', () => {
    render(<SettingsForm initial={settings} />);
    const names = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(names).toEqual(['Thông tin site', 'Dải thông báo', 'Danh sách', 'Bộ sưu tập', 'Chân trang']);
  });
});
