'use client';

import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import { AdminNav } from '../admin-nav';
import styles from './admin-shell.module.css';

export function AdminNavDrawer({ siteName, children }: { siteName: string; children: ReactNode }) {
  const { dialogRef, open, close, onDialogClose, onDialogClick } = useModalDialog();
  const pathname = usePathname();

  useEffect(() => {
    if (dialogRef.current?.open) close();
  }, [pathname, close, dialogRef]);

  return (
    <>
      <button type="button" className={styles.iconButton} onClick={open} aria-haspopup="dialog" aria-label="Mở menu">
        <DecorativeIcon icon={Menu} />
      </button>
      <dialog
        ref={dialogRef}
        className={styles.drawer}
        aria-label="Menu quản trị"
        onClose={onDialogClose}
        onClick={onDialogClick}
      >
        <div className={styles.drawerBody}>
          <div className={styles.drawerHead}>
            <strong>{siteName}</strong>
            <button type="button" className={styles.iconButton} onClick={close} aria-label="Đóng menu">
              <DecorativeIcon icon={X} />
            </button>
          </div>
          <AdminNav />
          <div className={styles.drawerFooter}>{children}</div>
        </div>
      </dialog>
    </>
  );
}
