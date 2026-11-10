import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_HOME_MODE } from '@under30ss/shared';
import { HomeModeNotice } from '@/components/admin/home-editor/home-mode-notice';
import { SettingsForm } from '@/components/admin/settings-form';
import { fromAdminSettings, toSettingsInput } from '@/components/admin/settings/settings-form-state';
import { jsonResponse } from './admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/admin' }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const settings = { siteName: 'Shop', seoTitle: 'Shop title', seoDescription: 'Desc' };

describe('homeMode in the settings form state', () => {
  it('defaults to the feed when the saved settings have no homeMode', () => {
    const state = fromAdminSettings(settings);
    expect(state.homeMode).toBe(DEFAULT_HOME_MODE);
    expect(toSettingsInput(state)).toMatchObject({ homeMode: 'feed' });
  });

  it('round-trips a saved sections mode', () => {
    const state = fromAdminSettings({ ...settings, homeMode: 'sections' });
    expect(state.homeMode).toBe('sections');
    expect(toSettingsInput(state)).toMatchObject({ homeMode: 'sections' });
  });
});

describe('SettingsForm home mode radio group', () => {
  it('preselects the feed and PUTs the mode the person picks', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={settings} />);

    const feed = screen.getByRole('radio', { name: /Feed outfit/ });
    const sections = screen.getByRole('radio', { name: /Các khối tự sắp/ });
    expect(screen.getByRole('group', { name: 'Trang chủ hiển thị' })).toBeInTheDocument();
    expect(feed).toBeChecked();

    await user.click(sections);
    expect(sections).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ homeMode: 'sections' });
  });

  it('loads a saved sections mode', () => {
    render(<SettingsForm initial={{ ...settings, homeMode: 'sections' }} />);
    expect(screen.getByRole('radio', { name: /Các khối tự sắp/ })).toBeChecked();
  });
});

describe('HomeModeNotice', () => {
  it.each([['feed' as const], [undefined]])('is shown with a settings link when mode is %s', (mode) => {
    render(<HomeModeNotice mode={mode} />);
    expect(screen.getByRole('status')).toHaveTextContent('Trang chủ đang hiển thị Feed outfit.');
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('href', '/admin/settings');
  });

  it('is hidden when mode is sections', () => {
    render(<HomeModeNotice mode="sections" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
