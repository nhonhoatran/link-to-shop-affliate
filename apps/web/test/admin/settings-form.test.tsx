import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
});
