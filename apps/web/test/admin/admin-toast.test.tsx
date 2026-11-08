import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '@/components/motion/motion-provider';
import { AdminToastProvider } from '@/components/admin/shell/admin-toast-provider';
import { useAdminToast } from '@/components/admin/shell/use-admin-toast';

function Trigger() {
  const toast = useAdminToast();
  return (
    <>
      <button type="button" onClick={() => toast.success('Đã lưu outfit')}>
        ok
      </button>
      <button type="button" onClick={() => toast.error('Không lưu được')}>
        fail
      </button>
    </>
  );
}

const onUndo = vi.fn();

function ActionTrigger() {
  const toast = useAdminToast();
  return (
    <button type="button" onClick={() => toast.success('Đã đăng', { action: { label: 'Hoàn tác', onClick: onUndo } })}>
      publish
    </button>
  );
}

const renderWithProvider = () =>
  render(
    <MotionProvider>
      <AdminToastProvider>
        <Trigger />
        <ActionTrigger />
      </AdminToastProvider>
    </MotionProvider>,
  );

afterEach(() => vi.useRealTimers());

describe('admin toast', () => {
  it('keeps both live regions mounted before any toast', () => {
    renderWithProvider();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('announces success in the status region and removes it automatically', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: 'ok' }));
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu outfit');
    await act(async () => {
      vi.advanceTimersByTime(4100);
    });
    await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent('Đã lưu outfit'));
  });

  it('keeps an error in the alert region until it is closed', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await user.click(screen.getByRole('button', { name: 'fail' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Không lưu được');
    await user.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeEmptyDOMElement());
  });

  it('is a no-op without a provider', async () => {
    const user = userEvent.setup();
    render(<Trigger />);
    await user.click(screen.getByRole('button', { name: 'ok' }));
    expect(screen.queryByText('Đã lưu outfit')).not.toBeInTheDocument();
  });

  describe('with an action', () => {
    beforeEach(() => onUndo.mockReset());

    it('runs the action once and closes the toast', async () => {
      const user = userEvent.setup();
      renderWithProvider();
      await user.click(screen.getByRole('button', { name: 'publish' }));
      expect(screen.getByRole('status')).toHaveTextContent('Đã đăng');
      await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Hoàn tác' }));
      expect(onUndo).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement());
    });

    it('outlives a plain toast and stays while the pointer is on it', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWithProvider();
      await user.click(screen.getByRole('button', { name: 'publish' }));
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByRole('status')).toHaveTextContent('Đã đăng');

      await user.hover(within(screen.getByRole('status')).getByRole('button', { name: 'Hoàn tác' }));
      await act(async () => {
        vi.advanceTimersByTime(30000);
      });
      expect(screen.getByRole('status')).toHaveTextContent('Đã đăng');

      await user.unhover(within(screen.getByRole('status')).getByRole('button', { name: 'Hoàn tác' }));
      await act(async () => {
        vi.advanceTimersByTime(10100);
      });
      await waitFor(() => expect(screen.getByRole('status')).not.toHaveTextContent('Đã đăng'));
    });
  });
});
