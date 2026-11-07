import type { ReactNode } from 'react';
import { AdminNavDrawer } from './admin-nav-drawer';
import styles from './admin-shell.module.css';

/** Shown below 768px only (CSS); `children` is the account block rendered inside the drawer. */
export function AdminTopbar({ siteName, children }: { siteName: string; children: ReactNode }) {
  return (
    <header className={styles.topbar}>
      <AdminNavDrawer siteName={siteName}>{children}</AdminNavDrawer>
      <span className={styles.topbarTitle}>{siteName}</span>
    </header>
  );
}
