import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsForm } from '@/components/admin/settings-form';
import { jsonResponse } from './admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/admin' }));
const fetchMock = vi.fn();
const settings = { siteName: 'Shop', seoTitle: 'Shop', seoDescription: '' };
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe('settings contact form', () => {
  it('starts blank and sends entered contact details', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={settings} />);
    expect(screen.getByLabelText('Email liên hệ')).toHaveValue('');
    expect(screen.getByLabelText('Số điện thoại liên hệ')).toHaveValue('');
    await user.type(screen.getByLabelText('Email liên hệ'), 'hello@example.com');
    await user.type(screen.getByLabelText('Số điện thoại liên hệ'), '+84 90 123 4567');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ contactEmail: 'hello@example.com', contactPhone: '+84 90 123 4567' });
  });

  it('loads saved contacts and allows clearing them', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={{ ...settings, contactEmail: 'hello@example.com', contactPhone: '090 123 4567' }} />);
    await user.clear(screen.getByLabelText('Email liên hệ'));
    await user.clear(screen.getByLabelText('Số điện thoại liên hệ'));
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ contactEmail: '', contactPhone: '' });
  });

  it('shows an actionable phone error and focuses the invalid field', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={{ ...settings, contactPhone: 'invalid' }} />);
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    const phone = screen.getByLabelText('Số điện thoại liên hệ');
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(phone).toHaveFocus();
    expect(screen.getByText(/Nhập số điện thoại, có thể dùng/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
