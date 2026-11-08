import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_ANNOUNCEMENT_TEXT } from '@under30ss/shared';
import { SettingsForm } from '@/components/admin/settings-form';
import { SettingsAnnouncementFields } from '@/components/admin/settings/settings-announcement-fields';
import type { AnnouncementValues } from '@/components/admin/settings/settings-form-state';
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

function Harness({ initial }: { initial: AnnouncementValues }) {
  const [values, setValues] = useState(initial);
  return <SettingsAnnouncementFields values={values} errors={{}} onChange={(patch) => setValues({ ...values, ...patch })} />;
}

describe('SettingsAnnouncementFields', () => {
  it('counts the characters left and previews the bar once there is text', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ enabled: true, text: '', linkLabel: '', href: '' }} />);
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByText(`Còn ${MAX_ANNOUNCEMENT_TEXT} ký tự`)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nội dung'), 'Giảm giá');
    await user.type(screen.getByLabelText('Chữ trên link (tuỳ chọn)'), 'Xem');
    await user.type(screen.getByLabelText('Đường dẫn (tuỳ chọn)'), '/looks');

    expect(screen.getByText(`Còn ${MAX_ANNOUNCEMENT_TEXT - 'Giảm giá'.length} ký tự`)).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Thông báo' })).toHaveTextContent('Giảm giá');
    expect(screen.getByRole('link', { name: 'Xem' })).toHaveAttribute('href', '/looks');
  });

  it('keeps the typed values when the toggle is switched off and on again', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ enabled: true, text: 'Giữ chữ', linkLabel: '', href: '' }} />);
    const toggle = screen.getByRole('checkbox', { name: 'Hiện dải thông báo trên đầu trang' });

    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(screen.getByLabelText('Nội dung')).toHaveValue('Giữ chữ');

    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(screen.getByLabelText('Nội dung')).toHaveValue('Giữ chữ');
  });
});

describe('SettingsForm announcement', () => {
  const invalidField = (name: string) => screen.getByLabelText(name);

  it('flags the text field when the announcement is on but empty, without sending a request', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={settings} />);

    await user.click(screen.getByRole('checkbox', { name: 'Hiện dải thông báo trên đầu trang' }));
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(invalidField('Nội dung')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Nhập nội dung thông báo')).toBeInTheDocument();
    await waitFor(() => expect(invalidField('Nội dung')).toHaveFocus());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flags a javascript: link on the path field', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={settings} />);

    await user.type(screen.getByLabelText('Chữ trên link (tuỳ chọn)'), 'Bấm');
    await user.type(screen.getByLabelText('Đường dẫn (tuỳ chọn)'), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(invalidField('Đường dẫn (tuỳ chọn)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Nhập đường dẫn trong site/, { selector: 'p' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks for a path when a link label has none', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={settings} />);

    await user.type(screen.getByLabelText('Chữ trên link (tuỳ chọn)'), 'Bấm');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(screen.getByText('Nhập đường dẫn cho link')).toBeInTheDocument();
  });

  it('saves an enabled announcement with a link in one request', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={settings} />);

    await user.click(screen.getByRole('checkbox', { name: 'Hiện dải thông báo trên đầu trang' }));
    await user.type(screen.getByLabelText('Nội dung'), '  Miễn phí vận chuyển  ');
    await user.type(screen.getByLabelText('Chữ trên link (tuỳ chọn)'), 'Xem ngay');
    await user.type(screen.getByLabelText('Đường dẫn (tuỳ chọn)'), '/collections');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).announcement).toEqual({
      enabled: true,
      text: 'Miễn phí vận chuyển',
      linkLabel: 'Xem ngay',
      href: '/collections',
    });
  });
});
