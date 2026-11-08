import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type FooterInput,
  MAX_FOOTER_COLUMNS,
  MAX_FOOTER_LINKS_PER_COLUMN,
  MAX_FOOTER_SOCIAL_LINKS,
} from '@under30ss/shared';
import { SettingsForm } from '@/components/admin/settings-form';
import { SettingsFooterColumnsEditor } from '@/components/admin/settings/settings-footer-columns-editor';
import { fromAdminSettings, type FooterColumnRow, type LinkRow } from '@/components/admin/settings/settings-form-state';
import { SettingsSocialLinksEditor } from '@/components/admin/settings/settings-social-links-editor';
import { jsonResponse } from './admin-outfit-fixture';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/admin' }));

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const base = { siteName: 'Shop', seoTitle: 'Shop title', seoDescription: 'Desc' };
const withFooter = {
  ...base,
  footer: {
    columns: [
      { title: 'Về chúng tôi', links: [{ label: 'Giới thiệu', href: '/about' }] },
      { title: 'Hỗ trợ', links: [{ label: 'Liên hệ', href: '/contact' }, { label: 'FAQ', href: '/faq' }] },
    ],
    social: [{ label: 'Facebook', href: 'https://facebook.com/shop' }],
  },
};

function ColumnsHarness({ initial }: { initial: FooterColumnRow[] }) {
  const [columns, setColumns] = useState(initial);
  return <SettingsFooterColumnsEditor columns={columns} errors={{}} onChange={setColumns} />;
}

function SocialHarness({ initial }: { initial: LinkRow[] }) {
  const [rows, setRows] = useState(initial);
  return <SettingsSocialLinksEditor rows={rows} errors={{}} onChange={setRows} />;
}

const columnsOf = (footer: FooterInput) => fromAdminSettings({ ...base, footer }).columns;

describe('SettingsFooterColumnsEditor', () => {
  it('adds a column with one empty link row and a title field', async () => {
    const user = userEvent.setup();
    render(<ColumnsHarness initial={[]} />);

    await user.click(screen.getByRole('button', { name: 'Thêm cột' }));

    expect(screen.getByLabelText('Tiêu đề cột')).toBeInTheDocument();
    expect(screen.getByLabelText('Chữ hiển thị')).toBeInTheDocument();
    expect(screen.getByLabelText('Đường dẫn')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Thêm link/ }));
    expect(screen.getAllByLabelText('Chữ hiển thị')).toHaveLength(2);
  });

  it('disables Thêm cột at the guard and says the maximum', async () => {
    const user = userEvent.setup();
    render(<ColumnsHarness initial={[]} />);
    for (let i = 0; i < MAX_FOOTER_COLUMNS; i += 1) await user.click(screen.getByRole('button', { name: 'Thêm cột' }));

    expect(screen.getByRole('button', { name: 'Thêm cột' })).toBeDisabled();
    expect(screen.getByText(`Tối đa ${MAX_FOOTER_COLUMNS} cột`)).toBeInTheDocument();
  });

  it('disables Thêm link at the per-column guard', async () => {
    const user = userEvent.setup();
    render(<ColumnsHarness initial={[]} />);
    await user.click(screen.getByRole('button', { name: 'Thêm cột' }));
    for (let i = 1; i < MAX_FOOTER_LINKS_PER_COLUMN; i += 1) {
      await user.click(screen.getByRole('button', { name: /^Thêm link/ }));
    }

    expect(screen.getByRole('button', { name: /^Thêm link/ })).toBeDisabled();
    expect(screen.getByText(`Tối đa ${MAX_FOOTER_LINKS_PER_COLUMN} link mỗi cột`)).toBeInTheDocument();
  });

  it('removes a single link without asking', async () => {
    const user = userEvent.setup();
    render(<ColumnsHarness initial={columnsOf(withFooter.footer)} />);

    await user.click(screen.getByRole('button', { name: 'Xoá link FAQ trong cột Hỗ trợ' }));

    expect(screen.queryByDisplayValue('FAQ')).toBeNull();
    expect(screen.getByDisplayValue('Liên hệ')).toBeInTheDocument();
  });

  it('asks before removing a column that has links, and keeps it on cancel', async () => {
    const user = userEvent.setup();
    render(<ColumnsHarness initial={columnsOf(withFooter.footer)} />);

    await user.click(screen.getByRole('button', { name: 'Xoá cột Hỗ trợ' }));
    expect(await screen.findByText('Xoá cột và 2 link trong cột?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(screen.getByDisplayValue('Hỗ trợ')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xoá cột Hỗ trợ' }));
    await user.click(screen.getByRole('button', { name: 'Xoá cột' }));
    expect(screen.queryByDisplayValue('Hỗ trợ')).toBeNull();
    expect(screen.getByDisplayValue('Về chúng tôi')).toBeInTheDocument();
  });

  it('removes an empty column without asking', async () => {
    const user = userEvent.setup();
    render(<ColumnsHarness initial={[]} />);
    await user.click(screen.getByRole('button', { name: 'Thêm cột' }));

    await user.click(screen.getByRole('button', { name: 'Xoá cột 1' }));

    expect(screen.queryByLabelText('Tiêu đề cột')).toBeNull();
  });

  it('moves a column down and up, with the end buttons disabled', async () => {
    const user = userEvent.setup();
    render(<ColumnsHarness initial={columnsOf(withFooter.footer)} />);
    const titles = () => screen.getAllByLabelText('Tiêu đề cột').map((input) => (input as HTMLInputElement).value);
    expect(screen.getByRole('button', { name: 'Chuyển cột Về chúng tôi lên' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Chuyển cột Hỗ trợ xuống' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Chuyển cột Về chúng tôi xuống' }));
    expect(titles()).toEqual(['Hỗ trợ', 'Về chúng tôi']);

    await user.click(screen.getByRole('button', { name: 'Chuyển cột Về chúng tôi lên' }));
    expect(titles()).toEqual(['Về chúng tôi', 'Hỗ trợ']);
  });
});

describe('SettingsSocialLinksEditor', () => {
  it('adds and removes rows and stops at the guard', async () => {
    const user = userEvent.setup();
    render(<SocialHarness initial={[]} />);
    for (let i = 0; i < MAX_FOOTER_SOCIAL_LINKS; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Thêm mạng xã hội' }));
    }
    expect(screen.getAllByLabelText('Tên')).toHaveLength(MAX_FOOTER_SOCIAL_LINKS);
    expect(screen.getByRole('button', { name: 'Thêm mạng xã hội' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Xoá mạng xã hội 1' }));
    expect(screen.getAllByLabelText('Tên')).toHaveLength(MAX_FOOTER_SOCIAL_LINKS - 1);
    expect(screen.getByRole('button', { name: 'Thêm mạng xã hội' })).toBeEnabled();
  });
});

describe('SettingsForm footer', () => {
  it('sends every settings key including the footer, so PUT never wipes it', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={withFooter} />);

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.footer).toEqual(withFooter.footer);
    expect(body.collectionsNavEnabled).toBe(true);
    expect(body.announcement).toEqual({ enabled: false, text: '' });
    expect(body).not.toHaveProperty('collectionsLabel');
  });

  it('shows a javascript: footer link error on the exact input and sends nothing', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={withFooter} />);
    const hrefs = screen.getAllByLabelText('Đường dẫn');
    await user.clear(hrefs[2]!);
    await user.type(hrefs[2]!, 'javascript:alert(1)');

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(fetchMock).not.toHaveBeenCalled();
    const fields = screen.getAllByLabelText('Đường dẫn');
    expect(fields[2]).toHaveAttribute('aria-invalid', 'true');
    expect(fields[0]).not.toHaveAttribute('aria-invalid');
    expect(fields[1]).not.toHaveAttribute('aria-invalid');
    await waitFor(() => expect(fields[2]).toHaveFocus());
    const errorId = fields[2]!.getAttribute('aria-describedby')!.split(' ').find((id) => id.endsWith('-error'))!;
    expect(document.getElementById(errorId)).toHaveTextContent('Nhập đường dẫn trong site');
  });

  it('rejects a non-https social link on its own input', async () => {
    const user = userEvent.setup();
    render(<SettingsForm initial={withFooter} />);
    const link = screen.getByLabelText('Link (https://...)');
    await user.clear(link);
    await user.type(link, '/not-external');

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(link).toHaveAttribute('aria-invalid', 'true');
    expect(within(link.closest('div')!).getByText('Nhập link bắt đầu bằng https://')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves a new column with two links and a social link', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(<SettingsForm initial={base} />);

    await user.click(screen.getByRole('button', { name: 'Thêm cột' }));
    await user.type(screen.getByLabelText('Tiêu đề cột'), 'Cửa hàng');
    await user.type(screen.getByLabelText('Chữ hiển thị'), 'Địa chỉ');
    await user.type(screen.getByLabelText('Đường dẫn'), '/stores');
    await user.click(screen.getByRole('button', { name: /^Thêm link/ }));
    const labels = screen.getAllByLabelText('Chữ hiển thị');
    await user.type(labels[1]!, 'Tuyển dụng');
    await user.type(screen.getAllByLabelText('Đường dẫn')[1]!, 'https://jobs.example.com');
    await user.click(screen.getByRole('button', { name: 'Thêm mạng xã hội' }));
    await user.type(screen.getByLabelText('Tên'), 'Zalo');
    await user.type(screen.getByLabelText('Link (https://...)'), 'https://zalo.me/shop');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).footer).toEqual({
      columns: [
        {
          title: 'Cửa hàng',
          links: [
            { label: 'Địa chỉ', href: '/stores' },
            { label: 'Tuyển dụng', href: 'https://jobs.example.com' },
          ],
        },
      ],
      social: [{ label: 'Zalo', href: 'https://zalo.me/shop' }],
    });
  });
});
