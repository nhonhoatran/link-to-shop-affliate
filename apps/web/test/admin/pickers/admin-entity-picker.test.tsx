import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AdminEntityPicker } from '@/components/admin/pickers/admin-entity-picker';
import { SEARCH_DEBOUNCE_MS, type PickerItem, type PickerSearch } from '@/components/admin/pickers/use-entity-search';

const router = { replace: vi.fn() };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const items: PickerItem[] = [
  { id: '1', label: 'Streetwear' },
  { id: '2', label: 'Đi làm', hint: 'Bản nháp' },
];

function Harness({ search, autoLoad = true }: { search: PickerSearch; autoLoad?: boolean }) {
  const [selected, setSelected] = useState<PickerItem[]>([]);
  return (
    <AdminEntityPicker
      id="p"
      label="Bộ sưu tập"
      searchPlaceholder="Gõ tên"
      emptyText="Không có kết quả."
      selected={selected}
      onChange={setSelected}
      search={search}
      autoLoad={autoLoad}
    />
  );
}

describe('AdminEntityPicker', () => {
  it('loads the first page right away when autoLoad is on and ticks into chips', async () => {
    const user = userEvent.setup();
    const search = vi.fn<PickerSearch>().mockResolvedValue({ items, total: 2 });
    render(<Harness search={search} />);
    expect(await screen.findByRole('checkbox', { name: /Streetwear/ })).not.toBeChecked();
    expect(search).toHaveBeenCalledWith('', expect.any(AbortSignal));

    await user.click(screen.getByRole('checkbox', { name: /Streetwear/ }));
    expect(screen.getByRole('checkbox', { name: /Streetwear/ })).toBeChecked();
    expect(screen.getByRole('list', { name: 'Bộ sưu tập đã chọn' })).toHaveTextContent('Streetwear');

    await user.click(screen.getByRole('button', { name: 'Bỏ Streetwear' }));
    expect(screen.getByRole('checkbox', { name: /Streetwear/ })).not.toBeChecked();
    expect(screen.queryByRole('list', { name: 'Bộ sưu tập đã chọn' })).toBeNull();
  });

  it('does not call the server until the person focuses or types when autoLoad is off', async () => {
    const user = userEvent.setup();
    const search = vi.fn<PickerSearch>().mockResolvedValue({ items, total: 2 });
    render(<Harness search={search} autoLoad={false} />);
    expect(search).not.toHaveBeenCalled();
    await user.click(screen.getByLabelText('Bộ sưu tập'));
    expect(await screen.findByRole('checkbox', { name: /Đi làm/ })).toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('debounces typing into one request with the trimmed query and cancels the previous one', async () => {
    const search = vi.fn<PickerSearch>().mockResolvedValue({ items, total: 2 });
    render(<Harness search={search} />);
    await screen.findByRole('checkbox', { name: /Streetwear/ });
    search.mockClear();

    vi.useFakeTimers();
    try {
      const input = screen.getByLabelText('Bộ sưu tập');
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: ' mùa ' } });
      expect(search).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      });
      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith('mùa', expect.any(AbortSignal));
    } finally {
      vi.useRealTimers();
    }
  });

  it('says when nothing matches', async () => {
    const search = vi.fn<PickerSearch>().mockResolvedValue({ items: [], total: 0 });
    render(<Harness search={search} />);
    await waitFor(() => expect(screen.getByText('Không có kết quả.')).toBeInTheDocument());
  });

  it('tells the person when only part of the matches are shown', async () => {
    const search = vi.fn<PickerSearch>().mockResolvedValue({ items, total: 57 });
    render(<Harness search={search} />);
    await waitFor(() => expect(screen.getByText('Hiện 2 / 57 kết quả. Gõ để thu hẹp.')).toBeInTheDocument());
  });

  it('shows an error line when the request fails', async () => {
    const search = vi.fn<PickerSearch>().mockRejectedValue(new Error('network'));
    render(<Harness search={search} />);
    await waitFor(() => expect(screen.getByText(/Không tải được danh sách/)).toBeInTheDocument());
  });

  it('does not submit an enclosing form on Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const search = vi.fn<PickerSearch>().mockResolvedValue({ items, total: 2 });
    render(
      <form onSubmit={onSubmit}>
        <Harness search={search} />
      </form>,
    );
    await user.type(screen.getByLabelText('Bộ sưu tập'), 'a{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
