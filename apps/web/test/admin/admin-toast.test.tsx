import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const renderWithProvider = () =>
  render(
    <MotionProvider>
      <AdminToastProvider>
        <Trigger />
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
});
