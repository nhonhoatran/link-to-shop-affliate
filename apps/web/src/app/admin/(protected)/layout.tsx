import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { AdminSidebar, AdminSidebarFooter } from '@/components/admin/shell/admin-sidebar';
import { AdminToastProvider } from '@/components/admin/shell/admin-toast-provider';
import { AdminTopbar } from '@/components/admin/shell/admin-topbar';
import styles from '@/components/admin/shell/admin-shell.module.css';
import { getAdminSettings, getCurrentAdmin } from '../_lib/admin-api';
import { readAdminTheme, readSidebarState } from '../_lib/admin-preferences';

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const [admin, settings, store] = await Promise.all([getCurrentAdmin(), getAdminSettings(), cookies()]);
  const theme = readAdminTheme(store);
  const sidebar = readSidebarState(store);
  return (
    <AdminToastProvider>
      <div className={styles.frame} data-sidebar={sidebar}>
        <a href="#admin-main" className={styles.skip}>
          Bỏ qua tới nội dung
        </a>
        <AdminSidebar siteName={settings.siteName} email={admin.email} theme={theme} sidebar={sidebar} />
        <AdminTopbar siteName={settings.siteName}>
          <AdminSidebarFooter email={admin.email} theme={theme} />
        </AdminTopbar>
        <main id="admin-main" className={styles.main}>
          {children}
        </main>
      </div>
    </AdminToastProvider>
  );
}
