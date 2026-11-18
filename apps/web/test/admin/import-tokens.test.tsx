import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ImportTokenDto } from '@under30ss/shared';
import { ImportTokenCreateForm } from '@/components/admin/import-token-create-form';
import { ImportTokenList } from '@/components/admin/import-token-list';
import { jsonResponse } from './admin-outfit-fixture';

const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const fetchMock = vi.fn();
const record: ImportTokenDto = {
  id: '0123456789abcdef01234567', label: 'Máy Windows', prefix: 'u30_import_abcde', scope: 'import:draft',
  expiresAt: '2027-01-01T00:00:00.000Z', revokedAt: null, createdAt: '2026-11-18T00:00:00.000Z',
};

beforeEach(() => { fetchMock.mockReset(); router.refresh.mockReset(); router.replace.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe('desktop import tokens', () => {
  it('shows the one-time secret after create and removes it when hidden', async () => {
    const user = userEvent.setup();
    const token = 'u30_import_test-secret-only-in-create-response';
    fetchMock.mockResolvedValue(jsonResponse({ token, record }, 201));
    render(<ImportTokenCreateForm />);
    await user.type(screen.getByLabelText('Tên thiết bị'), 'Máy Windows');
    await user.type(screen.getByLabelText('Hạn dùng'), '2026-12-25T10:00');
    await user.click(screen.getByRole('button', { name: 'Tạo token' }));
    expect(await screen.findByLabelText('Token vừa tạo')).toHaveValue(token);
    expect(screen.getByLabelText('Tên thiết bị')).toHaveValue('');
    expect(router.refresh).toHaveBeenCalled();
    const sent = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(sent.label).toBe('Máy Windows');
    expect(Number.isFinite(Date.parse(sent.expiresAt as string))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Ẩn token' }));
    expect(screen.queryByLabelText('Token vừa tạo')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(token);
  });

  it('reports API field errors and redirects an expired admin session', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'Hạn token không hợp lệ', fields: { expiresAt: 'Chọn hạn trong một năm tới' } } }, 400));
    render(<ImportTokenCreateForm />);
    await user.type(screen.getByLabelText('Tên thiết bị'), 'Máy Windows');
    await user.type(screen.getByLabelText('Hạn dùng'), '2026-12-25T10:00');
    await user.click(screen.getByRole('button', { name: 'Tạo token' }));
    expect(await screen.findByText('Chọn hạn trong một năm tới')).toBeInTheDocument();
    expect(screen.queryByLabelText('Token vừa tạo')).not.toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Hết phiên' } }, 401));
    await user.click(screen.getByRole('button', { name: 'Tạo token' }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login'));
  });

  it('renders only token metadata and confirms revocation before requesting it', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    render(<ImportTokenList items={[record]} nowIso="2026-11-18T00:00:00.000Z" timeZone="UTC" />);
    expect(screen.getByText('Đang dùng')).toBeInTheDocument();
    expect(screen.getByText(`${record.prefix}…`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thu hồi token Máy Windows' }));
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Thu hồi token' }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/admin/import-tokens/${record.id}`);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' });
  });

  it('labels revoked and expired tokens, keeps revoke failures visible, and supports an empty list', async () => {
    const { unmount } = render(<ImportTokenList items={[
      { ...record, revokedAt: '2026-11-18T01:00:00.000Z' },
      { ...record, id: '1123456789abcdef01234567', label: 'Máy cũ', expiresAt: '2026-01-01T00:00:00.000Z' },
    ]} nowIso="2026-11-18T00:00:00.000Z" timeZone="UTC" />);
    expect(screen.getByText('Đã thu hồi')).toBeInTheDocument();
    expect(screen.getByText('Hết hạn')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thu hồi token Máy Windows' })).not.toBeInTheDocument();
    unmount();
    render(<ImportTokenList items={[]} nowIso="2026-11-18T00:00:00.000Z" timeZone="UTC" />);
    expect(screen.getByText('Chưa có token nhập desktop.')).toBeInTheDocument();
  });
});
