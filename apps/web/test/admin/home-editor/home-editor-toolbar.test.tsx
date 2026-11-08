import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { HomeEditorToolbar, homeStatusText } from '@/components/admin/home-editor/home-editor-toolbar';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

const handlers = () => ({
  onSaveDraft: vi.fn(),
  onPublish: vi.fn(),
  onOpenPreview: vi.fn(),
  onRestore: vi.fn(),
  onRevert: vi.fn(),
  onReset: vi.fn(),
});

type Props = Partial<Parameters<typeof HomeEditorToolbar>[0]>;
const renderToolbar = (props: Props = {}) => {
  const fns = handlers();
  render(
    <HomeEditorToolbar
      saveStatus="idle"
      dirty={false}
      hasUnpublishedChanges={false}
      usingDefault
      publishedAt={null}
      busy={false}
      canRestore={false}
      {...fns}
      {...props}
    />,
  );
  return fns;
};

const status = () => screen.getAllByRole('status')[0]!;

describe('homeStatusText', () => {
  const base = { saveStatus: 'idle', dirty: false, hasUnpublishedChanges: false, usingDefault: false, publishedAt: 'P' } as const;

  it('picks the most urgent state first', () => {
    expect(homeStatusText({ ...base, saveStatus: 'saving', dirty: true }, true)).toBe('Đang lưu…');
    expect(homeStatusText({ ...base, saveStatus: 'error' }, true)).toBe('Chưa lưu được');
    expect(homeStatusText({ ...base, dirty: true }, true)).toBe('Có thay đổi chưa đăng');
    expect(homeStatusText({ ...base, hasUnpublishedChanges: true }, true)).toBe('Có thay đổi chưa đăng');
    expect(homeStatusText({ ...base, usingDefault: true, publishedAt: null }, true)).toBe('Đang dùng bố cục mặc định');
  });

  it('shows the publish time only once the browser can format it, never during hydration', () => {
    const at = '2026-11-07T08:30:00.000Z';
    expect(homeStatusText({ ...base, publishedAt: at }, false)).toBe('Đã đăng');
    expect(homeStatusText({ ...base, publishedAt: at }, true)).toMatch(/^Đã đăng lúc .*\d/);
  });
});

describe('HomeEditorToolbar', () => {
  it('shows the state and keeps "Đăng" disabled while there is nothing to publish', () => {
    renderToolbar();
    expect(screen.getByRole('heading', { level: 1, name: 'Trang chủ' })).toBeInTheDocument();
    expect(status()).toHaveTextContent('Đang dùng bố cục mặc định');
    expect(screen.getByRole('button', { name: 'Đăng' })).toBeDisabled();
  });

  it('publishes in one click with no confirmation when there are changes', async () => {
    const user = userEvent.setup();
    const fns = renderToolbar({ dirty: true });
    await user.click(screen.getByRole('button', { name: 'Đăng' }));
    expect(fns.onPublish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves a draft and opens the preview from the toolbar', async () => {
    const user = userEvent.setup();
    const fns = renderToolbar({ dirty: true });
    await user.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await user.click(screen.getByRole('button', { name: 'Mở trang xem trước' }));
    expect(fns.onSaveDraft).toHaveBeenCalledTimes(1);
    expect(fns.onOpenPreview).toHaveBeenCalledTimes(1);
  });

  it('disables the actions while a request is running', () => {
    renderToolbar({ busy: true, dirty: true, saveStatus: 'saving' });
    expect(screen.getByRole('button', { name: 'Đăng' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeDisabled();
    expect(status()).toHaveTextContent('Đang lưu…');
  });
});

describe('HomeEditorToolbar "Khác" menu', () => {
  const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Khác' }));
    return screen.getByRole('menu', { name: 'Thêm thao tác cho trang chủ' });
  };

  it('stays closed until opened and lists the three layout actions', async () => {
    const user = userEvent.setup();
    renderToolbar({ canRestore: true, hasUnpublishedChanges: true });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Khác' })).toHaveAttribute('aria-expanded', 'false');
    const menu = await openMenu(user);
    expect(screen.getByRole('button', { name: 'Khác' })).toHaveAttribute('aria-expanded', 'true');
    for (const name of ['Hoàn tác lần đăng gần nhất', 'Bỏ thay đổi chưa đăng', 'Khôi phục bố cục mặc định']) {
      expect(within(menu).getByRole('menuitem', { name })).toBeEnabled();
    }
  });

  it('undoes the last publish straight away, without asking', async () => {
    const user = userEvent.setup();
    const fns = renderToolbar({ canRestore: true });
    const menu = await openMenu(user);
    await user.click(within(menu).getByRole('menuitem', { name: 'Hoàn tác lần đăng gần nhất' }));
    expect(fns.onRestore).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables undo when there is no earlier publish and revert when nothing is pending', async () => {
    const user = userEvent.setup();
    renderToolbar({ canRestore: false });
    const menu = await openMenu(user);
    expect(within(menu).getByRole('menuitem', { name: 'Hoàn tác lần đăng gần nhất' })).toBeDisabled();
    expect(within(menu).getByRole('menuitem', { name: 'Bỏ thay đổi chưa đăng' })).toBeDisabled();
  });

  it('asks before resetting to the default layout and says what is lost', async () => {
    const user = userEvent.setup();
    const fns = renderToolbar();
    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Khôi phục bố cục mặc định' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Bản nháp sẽ mất. Bản đang đăng có thể hoàn tác.');
    expect(fns.onReset).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Huỷ' }));
    expect(fns.onReset).not.toHaveBeenCalled();

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Khôi phục bố cục mặc định' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Khôi phục mặc định' }));
    expect(fns.onReset).toHaveBeenCalledTimes(1);
  });

  it('asks before discarding unpublished changes', async () => {
    const user = userEvent.setup();
    const fns = renderToolbar({ hasUnpublishedChanges: true });
    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: 'Bỏ thay đổi chưa đăng' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(fns.onRevert).toHaveBeenCalledTimes(1);
  });

  it('works from the keyboard: arrows move, Escape closes and returns focus to the button', async () => {
    const user = userEvent.setup();
    renderToolbar({ canRestore: true, hasUnpublishedChanges: true });
    const trigger = screen.getByRole('button', { name: 'Khác' });
    trigger.focus();
    await user.keyboard('{Enter}');
    const items = screen.getAllByRole('menuitem').filter((item) => !(item as HTMLButtonElement).disabled);
    expect(document.activeElement).toBe(items[0]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[1]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(items.at(-1));
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(items[0]);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes when clicking elsewhere', async () => {
    const user = userEvent.setup();
    renderToolbar();
    await openMenu(user);
    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
