import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { AdminHomeLayoutDto } from '@under30ss/shared';
import { SectionListPanel } from '@/components/admin/home-editor/section-list-panel';
import { useHomeLayoutState } from '@/components/admin/home-editor/use-home-layout-state';
import { adminHomeDto } from './home-editor-fixture';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/hooks/use-modal-dialog', async (importOriginal) => importOriginal());

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

function Harness({ dto }: { dto: AdminHomeLayoutDto }) {
  const { state, dispatch } = useHomeLayoutState(dto);
  return (
    <>
      <SectionListPanel state={state} dispatch={dispatch} errors={{}} />
      <output data-testid="order">{state.content.map((section) => section.type).join(',')}</output>
    </>
  );
}

const renderPanel = (dto = adminHomeDto()) => render(<Harness dto={dto} />);
const order = () => screen.getByTestId('order').textContent;
const cards = () => Array.from(document.querySelectorAll<HTMLElement>('[data-section-card]'));

describe('section cards', () => {
  it('lists the sections in order with an end-aware Up/Down pair on every card', () => {
    renderPanel();
    const list = cards();
    expect(list).toHaveLength(7);
    expect(within(list[0]!).getByRole('button', { name: /^Đưa .* lên$/ })).toBeDisabled();
    expect(within(list[0]!).getByRole('button', { name: /^Đưa .* xuống$/ })).toBeEnabled();
    expect(within(list.at(-1)!).getByRole('button', { name: /^Đưa .* xuống$/ })).toBeDisabled();
    expect(within(list.at(-1)!).getByRole('button', { name: /^Đưa .* lên$/ })).toBeEnabled();
  });

  it('gives every control a name that says which section it belongs to', () => {
    renderPanel();
    const hero = cards()[0]!;
    expect(within(hero).getByRole('button', { name: /^Kéo để sắp xếp Banner trượt/ })).toBeInTheDocument();
    expect(within(hero).getByRole('switch', { name: /^Hiện Banner trượt/ })).toBeChecked();
    expect(within(hero).getByRole('button', { name: /^Xoá Banner trượt/ })).toBeInTheDocument();
    expect(within(hero).getByRole('button', { name: /^Sửa Banner trượt/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('moves a section down with the button, announces it and keeps focus on the same button', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(within(cards()[0]!).getByRole('button', { name: /^Đưa .* xuống$/ }));

    expect(order().split(',').slice(0, 2)).toEqual(['CollectionTiles', 'HeroSlider']);
    expect(screen.getByText(/^Đã chuyển Banner trượt .* tới vị trí 2\/7$/)).toBeInTheDocument();
    expect(document.activeElement).toBe(within(cards()[1]!).getByRole('button', { name: /^Đưa .* xuống$/ }));
  });

  it('moves focus to the other button when a section reaches an end', async () => {
    const user = userEvent.setup();
    renderPanel(adminHomeDto({ draft: adminHomeDto().draft.slice(0, 2) }));
    await user.click(within(cards()[0]!).getByRole('button', { name: /^Đưa .* xuống$/ }));
    expect(document.activeElement).toBe(within(cards()[1]!).getByRole('button', { name: /^Đưa .* lên$/ }));
  });

  it('hides and shows a section with the switch', async () => {
    const user = userEvent.setup();
    renderPanel();
    const hero = cards()[0]!;
    await user.click(within(hero).getByRole('switch'));
    expect(within(hero).getByRole('switch')).not.toBeChecked();
    expect(within(hero).getByText('Đang ẩn')).toBeInTheDocument();
    await user.click(within(hero).getByRole('switch'));
    expect(within(hero).queryByText('Đang ẩn')).not.toBeInTheDocument();
  });

  it('opens the form on "Sửa" and closes it on a second press', async () => {
    const user = userEvent.setup();
    renderPanel();
    const faq = cards()[5]!;
    await user.click(within(faq).getByRole('button', { name: /^Sửa/ }));
    expect(within(faq).getByRole('group', { name: /^Nội dung/ })).toBeInTheDocument();
    expect(within(faq).getByRole('button', { name: /^Thu gọn/ })).toHaveAttribute('aria-expanded', 'true');
    await user.click(within(faq).getByRole('button', { name: /^Thu gọn/ }));
    expect(within(faq).queryByRole('group')).not.toBeInTheDocument();
  });

  it('asks before removing and removes only on confirm', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(within(cards()[0]!).getByRole('button', { name: /^Xoá Banner trượt/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /^Xoá section Banner trượt/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ' }));
    expect(cards()).toHaveLength(7);

    await user.click(within(cards()[0]!).getByRole('button', { name: /^Xoá Banner trượt/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xoá' }));
    expect(cards()).toHaveLength(6);
    expect(order().startsWith('CollectionTiles')).toBe(true);
  });

  it('picks a section up from the keyboard and reads Vietnamese instructions and position announcements', async () => {
    renderPanel();
    const handle = within(cards()[0]!).getByRole('button', { name: /^Kéo để sắp xếp/ });
    expect(handle).toHaveAttribute('aria-roledescription', 'sortable');
    const instructionsId = handle.getAttribute('aria-describedby')!;
    expect(document.getElementById(instructionsId)).toHaveTextContent('Nhấn Space để nhấc section');

    handle.focus();
    fireEvent.keyDown(handle, { code: 'Space', key: ' ' });
    expect(await screen.findByText(/^Banner trượt .* đang ở vị trí 1\/7\.$/)).toBeInTheDocument();
    // The move itself needs layout (dnd-kit measures neighbours), which jsdom does not have; the e2e specs cover it.
  });
});
