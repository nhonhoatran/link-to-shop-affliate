import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { useModalDialog } from '@/hooks/use-modal-dialog';

beforeAll(() => {
  // jsdom lacks showModal/close on <dialog>.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

function Harness() {
  const { dialogRef, open, close, onDialogClose, onDialogClick } = useModalDialog();
  return (
    <>
      <button type="button" onClick={open}>
        open
      </button>
      <dialog ref={dialogRef} data-testid="dlg" onClose={onDialogClose} onClick={onDialogClick}>
        <p>content</p>
        <button type="button" onClick={close}>
          inner close
        </button>
      </dialog>
    </>
  );
}

describe('useModalDialog', () => {
  it('opens via showModal and restores focus to the opener on close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    await user.click(opener);
    expect(screen.getByTestId('dlg').hasAttribute('open')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'inner close', hidden: true }));
    expect(screen.getByTestId('dlg').hasAttribute('open')).toBe(false);
    expect(opener).toHaveFocus();
  });

  it('closes when the backdrop (the dialog element itself) is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(screen.getByTestId('dlg'));
    expect(screen.getByTestId('dlg').hasAttribute('open')).toBe(false);
  });

  it('stays open when clicking content inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    fireEvent.click(screen.getByText('content'));
    expect(screen.getByTestId('dlg').hasAttribute('open')).toBe(true);
  });

  it('closes on the native close event fired by Esc', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    await user.click(opener);
    const dlg = screen.getByTestId('dlg');
    dlg.removeAttribute('open');
    fireEvent(dlg, new Event('close'));
    expect(opener).toHaveFocus();
  });
});
