import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/admin-nav';
import { LogoutButton } from '@/components/admin/logout-button';
import styles from '@/components/admin/admin.module.css';
import { getAdminSettings, getCurrentAdmin } from '../_lib/admin-api';

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const [admin, settings] = await Promise.all([getCurrentAdmin(), getAdminSettings()]);
  return (
    <>
      <header className={styles.header}>
        <span className={styles.siteName}>{settings.siteName}</span>
        <AdminNav />
        <span className={styles.hint}>{admin.email}</span>
        <LogoutButton />
      </header>
      <main className={styles.main}>{children}</main>
    </>
  );
}
