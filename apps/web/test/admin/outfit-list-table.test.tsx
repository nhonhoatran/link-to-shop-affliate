import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AdminOutfitListItemDto } from '@under30ss/shared';
import { OutfitListTable } from '@/components/admin/outfit-list-table';

const item = (patch: Partial<AdminOutfitListItemDto> = {}): AdminOutfitListItemDto => ({
  id: 'o1',
  slug: 'ao-thun',
  title: 'Áo thun',
  status: 'published',
  featured: true,
  modelImageUrl: 'https://media.example.test/model.webp',
  itemCount: 2,
  updatedAt: '2026-11-01T03:00:00.000Z',
  ...patch,
} as AdminOutfitListItemDto);

describe('OutfitListTable', () => {
  it('keeps table semantics explicitly and labels the cells that show as cards on mobile', () => {
    render(<OutfitListTable items={[item()]} timeZone="Asia/Ho_Chi_Minh" />);
    const table = screen.getByRole('table', { name: 'Danh sách outfit' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    const row = within(table).getAllByRole('row')[1]!;
    const cells = within(row).getAllByRole('cell');
    expect(cells.map((cell) => cell.getAttribute('data-label'))).toEqual(['', '', 'Trạng thái', '', 'Cập nhật']);
    expect(within(row).getByRole('link', { name: 'Áo thun' })).toHaveAttribute('href', '/admin/outfits/o1');
    expect(within(row).getByText('Đã đăng')).toBeInTheDocument();
  });

  it('shows one empty row when nothing matches', () => {
    render(<OutfitListTable items={[]} timeZone="UTC" />);
    expect(screen.getByText('Chưa có outfit nào khớp.')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});
