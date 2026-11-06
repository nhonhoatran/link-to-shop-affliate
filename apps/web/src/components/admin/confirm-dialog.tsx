'use client';

import { useEffect, useId, useRef } from 'react';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Huỷ',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog ref={ref} className={formStyles.dialog} aria-labelledby={titleId} onCancel={onCancel}>
      <h2 id={titleId} className={styles.panelTitle}>
        {title}
      </h2>
      <p>{message}</p>
      <div className={formStyles.dialogActions}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onCancel} autoFocus>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${danger ? styles.btnDanger : styles.btnPrimary}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
