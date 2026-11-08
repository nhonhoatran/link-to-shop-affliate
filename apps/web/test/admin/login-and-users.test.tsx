import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/admin/login-form';
import { UserCreateForm } from '@/components/admin/user-create-form';
import { UserList } from '@/components/admin/user-list';
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

describe('LoginForm', () => {
  it('keeps a 401 on the form as a wrong-credentials message instead of redirecting', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Sai email hoặc mật khẩu' } }, 401));
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'a@example.test');
    await user.type(screen.getByLabelText('Mật khẩu'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Sai email hoặc mật khẩu');
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('toggles password visibility without submitting the form', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const password = screen.getByLabelText('Mật khẩu');
    const reveal = screen.getByRole('button', { name: 'Hiện mật khẩu' });

    expect(password).toHaveAttribute('type', 'password');
    await user.click(reveal);
    expect(password).toHaveAttribute('type', 'text');
    expect(reveal).toHaveAttribute('aria-pressed', 'true');
    await user.click(reveal);
    expect(password).toHaveAttribute('type', 'password');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('UserCreateForm', () => {
  it('reports the added admin in a status line and clears the form', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}, 201));
    render(<UserCreateForm />);

    await user.type(screen.getByLabelText('Email'), 'new@example.test');
    await user.type(screen.getByLabelText('Mật khẩu tạm'), 'long-enough-1');
    await user.click(screen.getByRole('button', { name: 'Thêm quản trị viên' }));

    await waitFor(() => expect(screen.getByText('Đã thêm new@example.test')).toBeInTheDocument());
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.getByText('Đã thêm new@example.test')).toHaveAttribute('role', 'status');
  });

  it('keeps the pending label on its own button (no save-status line here)', async () => {
    const user = userEvent.setup();
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    render(<UserCreateForm />);

    await user.type(screen.getByLabelText('Email'), 'new@example.test');
    await user.type(screen.getByLabelText('Mật khẩu tạm'), 'long-enough-1');
    await user.click(screen.getByRole('button', { name: 'Thêm quản trị viên' }));

    expect(await screen.findByRole('button', { name: 'Đang thêm…' })).toBeDisabled();
  });

  it('does not promise a password change', () => {
    render(<UserCreateForm />);
    expect(screen.getByText('Gửi mật khẩu này cho người dùng')).toBeInTheDocument();
    expect(screen.queryByText(/đổi sau/)).not.toBeInTheDocument();
  });
});

describe('UserList', () => {
  const users = [
    { id: 'me', email: 'me@example.test', createdAt: '2026-11-05T20:00:00.000Z' },
    { id: 'other', email: 'other@example.test', createdAt: '2026-11-05T20:00:00.000Z' },
  ];

  it('formats the created date in the given time zone', () => {
    render(<UserList users={users} currentUserId="me" timeZone="Asia/Ho_Chi_Minh" />);
    expect(screen.getAllByText('6/11/26')).toHaveLength(2);
  });

  it('labels the created-date cell for the stacked card layout on small screens', () => {
    render(<UserList users={users} currentUserId="me" timeZone="UTC" />);
    expect(screen.getAllByRole('cell')[1]).toHaveAttribute('data-label', 'Ngày tạo');
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('confirms with a consistent title, then shows a pending state while deleting', async () => {
    const user = userEvent.setup();
    let finish: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (finish = resolve)));
    render(<UserList users={users} currentUserId="me" timeZone="UTC" />);

    await user.click(screen.getByRole('button', { name: 'Xoá quản trị viên other@example.test' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Xoá quản trị viên này?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Xoá quản trị viên' }));

    const pending = await screen.findByRole('button', { name: 'Đang xoá…' });
    expect(pending).toBeDisabled();
    finish(new Response(null, { status: 204 }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it('sends the person to the login page on a 401', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Hết phiên' } }, 401));
    render(<UserList users={users} currentUserId="me" timeZone="UTC" />);

    await user.click(screen.getByRole('button', { name: 'Xoá quản trị viên other@example.test' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá quản trị viên' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
