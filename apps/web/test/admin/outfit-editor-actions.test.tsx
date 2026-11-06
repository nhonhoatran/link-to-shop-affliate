import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  router.replace.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const published = (featured = false) =>
  makeAdminOutfit((outfit) => {
    outfit.status = 'published';
    outfit.featured = featured;
  });

const ctrlS = () => fireEvent.keyDown(window, { key: 's', ctrlKey: true });

describe('OutfitEditor: save', () => {
  it('ignores Ctrl+S and the Save button while a save is in flight', async () => {
    let finish: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    render(<OutfitEditor initial={makeAdminOutfit()} />);

    ctrlS();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled());
    ctrlS();
    ctrlS();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The status line says it once; the button keeps its label.
    expect(screen.getAllByText('Đang lưu…')).toHaveLength(1);

    finish(jsonResponse({}));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeEnabled());
    ctrlS();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('never sends a stale featured flag in the PUT body', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<OutfitEditor initial={published(true)} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body).featured).toBe(false);
  });

  it('sends the person to the login page on a 401', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Hết phiên' } }, 401));
    render(<OutfitEditor initial={makeAdminOutfit()} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('OutfitEditor: featured', () => {
  it('disables "Đặt nổi bật" for a draft and explains why', () => {
    render(<OutfitEditor initial={makeAdminOutfit()} />);
    const button = screen.getByRole('button', { name: 'Đặt nổi bật' });
    expect(button).toBeDisabled();
    const hint = document.getElementById(button.getAttribute('aria-describedby')!);
    expect(hint).toHaveTextContent('Đăng outfit trước khi đặt nổi bật');
  });

  it('features a published outfit through its own endpoint and shows the pressed state', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<OutfitEditor initial={published()} />);

    await user.click(screen.getByRole('button', { name: 'Đặt nổi bật' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Bỏ nổi bật' })).toHaveAttribute('aria-pressed', 'true'));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/admin/outfits/outfit-1/featured');
    expect(JSON.parse(init.body)).toEqual({ featured: true });
  });

  it('drops featured and blocks it again after the outfit goes back to draft', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<OutfitEditor initial={published(true)} />);

    await user.click(screen.getByRole('button', { name: 'Ẩn' }));

    const button = await screen.findByRole('button', { name: 'Đặt nổi bật' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('OutfitEditor: delete', () => {
  it('shows a pending, disabled delete button while the request runs', async () => {
    const user = userEvent.setup();
    let finish: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    render(<OutfitEditor initial={makeAdminOutfit()} />);

    await user.click(screen.getByRole('button', { name: 'Xoá outfit' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá outfit' }));

    const pending = await screen.findByRole('button', { name: 'Đang xoá…' });
    expect(pending).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled();

    finish(new Response(null, { status: 204 }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin'));
  });
});

describe('OutfitEditor: structure', () => {
  it('has one h1 in the toolbar and panels named by their visible h2', () => {
    render(<OutfitEditor initial={makeAdminOutfit()} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const name of ['Món trong outfit', 'Đặt điểm trên người mẫu', 'Thông tin outfit', 'Xem trước']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
  });

  it('exposes the model-image and item dropzones as labelled fields', () => {
    render(<OutfitEditor initial={makeAdminOutfit()} />);
    expect(screen.getByLabelText('Đổi ảnh người mẫu')).toHaveAttribute('type', 'file');
    expect(screen.getByLabelText('Thêm món')).toHaveAttribute('type', 'file');
  });

  it('marks the preview size buttons as a pressed toggle group', async () => {
    const user = userEvent.setup();
    render(<OutfitEditor initial={makeAdminOutfit()} />);
    const desktop = screen.getByRole('button', { name: 'Máy tính' });
    const mobile = screen.getByRole('button', { name: 'Điện thoại' });
    expect(desktop).toHaveAttribute('aria-pressed', 'true');
    await user.click(mobile);
    expect(mobile).toHaveAttribute('aria-pressed', 'true');
    expect(desktop).toHaveAttribute('aria-pressed', 'false');
  });

  it('warns politely about items without an anchor in the preview', () => {
    const outfit = makeAdminOutfit((o) => {
      delete o.items[0]!.anchor;
    });
    render(<OutfitEditor initial={outfit} />);
    expect(screen.getByText(/1 món chưa đặt điểm nên chưa hiện/)).toBeInTheDocument();
  });
});
