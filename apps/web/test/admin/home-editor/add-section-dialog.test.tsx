import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { HOME_SECTION_META, HOME_SECTION_TYPES } from '@under30ss/shared';
import { SectionListPanel } from '@/components/admin/home-editor/section-list-panel';
import { useHomeLayoutState } from '@/components/admin/home-editor/use-home-layout-state';
import { adminHomeDto } from './home-editor-fixture';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  Element.prototype.scrollIntoView = vi.fn();
});

function Harness({ empty = false }: { empty?: boolean }) {
  const { state, dispatch } = useHomeLayoutState(adminHomeDto(empty ? { draft: [] } : {}));
  return (
    <>
      <SectionListPanel state={state} dispatch={dispatch} errors={{}} />
      <output data-testid="order">{state.content.map((section) => section.type).join(',')}</output>
    </>
  );
}

const order = () => screen.getByTestId('order').textContent!.split(',').filter(Boolean);
const inDialog = () => within(screen.getByRole('dialog', { name: 'Thêm section' }));
const openDialog = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: '+ Thêm section' }));

describe('AddSectionDialog', () => {
  it('lists all seven types with their one-line description', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openDialog(user);
    const dialog = screen.getByRole('dialog', { name: 'Thêm section' });
    const buttons = within(dialog).getAllByRole('button').filter((button) => button.textContent !== 'Đóng');
    expect(buttons).toHaveLength(HOME_SECTION_TYPES.length);
    for (const type of HOME_SECTION_TYPES) {
      expect(within(dialog).getByRole('button', { name: new RegExp(HOME_SECTION_META[type].label) })).toHaveTextContent(
        HOME_SECTION_META[type].description,
      );
    }
  });

  it('adds the chosen type at the end, opens its form and puts the cursor in the first field', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openDialog(user);
    await user.click(inDialog().getByRole('button', { name: /Câu hỏi thường gặp/ }));

    expect(order().at(-1)).toBe('Faq');
    expect(order()).toHaveLength(8);
    expect(document.querySelector('dialog[aria-labelledby="add-section-title"]')).not.toHaveAttribute('open');
    const firstField = screen.getByLabelText('Tiêu đề', { selector: 'input' });
    expect(firstField).toHaveValue('Câu hỏi thường gặp');
    expect(document.activeElement).toBe(firstField);
  });

  it('adds right after the section being edited', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getAllByRole('button', { name: /^Sửa Bộ sưu tập/ })[0]!);
    await openDialog(user);
    await user.click(inDialog().getByRole('button', { name: /Chữ và ảnh/ }));
    expect(order().slice(1, 4)).toEqual(['CollectionTiles', 'TextWithImage', 'OutfitList']);
  });

  it('works from an empty layout and says what to do', async () => {
    const user = userEvent.setup();
    render(<Harness empty />);
    expect(screen.getByText(/Chưa có section nào/)).toBeInTheDocument();
    await openDialog(user);
    await user.click(inDialog().getByRole('button', { name: /Cam kết/ }));
    expect(order()).toEqual(['Commitments']);
    expect(screen.queryByText(/Chưa có section nào/)).not.toBeInTheDocument();
  });

  it('closes without adding', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openDialog(user);
    await user.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(order()).toHaveLength(7);
  });
});
