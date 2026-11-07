'use client';

import { useCallback, useRef, type MouseEvent } from 'react';

export function useModalDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
  }, []);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Fires for Esc, backdrop click and close(); focus goes back to whoever opened the dialog.
  const onDialogClose = useCallback(() => {
    openerRef.current?.focus();
    openerRef.current = null;
  }, []);

  // A click whose target is the dialog itself landed on the backdrop (content sits in children).
  const onDialogClick = useCallback((event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }, []);

  return { dialogRef, openerRef, open, close, onDialogClose, onDialogClick };
}
