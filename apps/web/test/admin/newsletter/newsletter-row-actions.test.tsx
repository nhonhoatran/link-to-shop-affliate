import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsletterRowActions } from '@/components/admin/newsletter/newsletter-row-actions';
import { jsonResponse } from '../admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  router.refresh.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const email = 'khach.a@example.test';
const dialogButton = async (name: string) => within(await screen.findByRole('dialog')).findByRole('button', { name });

describe('NewsletterRowActions', () => {
  it('posts the unsubscribe after confirmation and refreshes the list', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<NewsletterRowActions id="n1" email={email} status="subscribed" />);
    await user.click(screen.getByRole('button', { name: `Huỷ đăng ký ${email}` }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(await dialogButton('Huỷ đăng ký'));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/newsletter/n1/unsubscribe');
    expect(fetchMock.mock.calls[0]![1].method).toBe('PATCH');
  });

  it('deletes only after the danger confirmation and says it cannot be undone', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<NewsletterRowActions id="n1" email={email} status="unsubscribed" />);
    await user.click(screen.getByRole('button', { name: `Xoá vĩnh viễn ${email}` }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/Không hoàn tác được/)).toBeInTheDocument();
    await user.click(await dialogButton('Xoá vĩnh viễn'));
    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/admin/newsletter/n1');
    expect(fetchMock.mock.calls[0]![1].method).toBe('DELETE');
  });

  it('shows the API error inline and does not refresh', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } }, 404));
    render(<NewsletterRowActions id="n1" email={email} status="unsubscribed" />);
    await user.click(screen.getByRole('button', { name: `Xoá vĩnh viễn ${email}` }));
    await user.click(await dialogButton('Xoá vĩnh viễn'));
    expect(await screen.findByText('Không tìm thấy')).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
