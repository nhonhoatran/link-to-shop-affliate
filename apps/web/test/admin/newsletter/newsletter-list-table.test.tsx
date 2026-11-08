import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sampleNewsletterSubscribers } from '@under30ss/shared/fixtures';
import { NewsletterListTable } from '@/components/admin/newsletter/newsletter-list-table';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('NewsletterListTable', () => {
  it('renders email, status badge, consent source and version', () => {
    render(<NewsletterListTable items={sampleNewsletterSubscribers} filtered={false} timeZone="Asia/Ho_Chi_Minh" />);
    const row = screen.getByText('khach.a@example.test').closest('tr')!;
    expect(within(row).getByText('Đang nhận tin')).toBeInTheDocument();
    expect(within(row).getByText('Trang chủ')).toBeInTheDocument();
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Đã huỷ')).toBeInTheDocument();
  });

  it('offers unsubscribe only for subscribed rows, delete for every row', () => {
    render(<NewsletterListTable items={sampleNewsletterSubscribers} filtered={false} timeZone="Asia/Ho_Chi_Minh" />);
    expect(screen.getByRole('button', { name: 'Huỷ đăng ký khach.a@example.test' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Huỷ đăng ký khach.b@example.test' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Xoá vĩnh viễn / })).toHaveLength(2);
  });

  it('shows a different empty message when a filter is active', () => {
    const { rerender } = render(<NewsletterListTable items={[]} filtered={false} timeZone="UTC" />);
    expect(screen.getByText('Chưa có người đăng ký.')).toBeInTheDocument();
    rerender(<NewsletterListTable items={[]} filtered timeZone="UTC" />);
    expect(screen.getByText('Không có kết quả phù hợp.')).toBeInTheDocument();
  });
});
