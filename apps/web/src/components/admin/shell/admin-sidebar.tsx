import type { AdminTheme, SidebarState } from '@/app/admin/_lib/admin-preferences';
import { AdminNav } from '../admin-nav';
import { LogoutButton } from '../logout-button';
import { AdminSidebarToggle } from './admin-sidebar-toggle';
import { AdminThemeToggle } from './admin-theme-toggle';
import styles from './admin-sidebar.module.css';

interface AdminSidebarProps {
  siteName: string;
  email: string;
  theme: AdminTheme;
  sidebar: SidebarState;
}

/** Account block shared by the desktop sidebar and the mobile drawer. */
export function AdminSidebarFooter({ email, theme }: { email: string; theme: AdminTheme }) {
  return (
    <div className={styles.footer}>
      <p className={`${styles.email} ${styles.label}`} title={email}>
        {email}
      </p>
      <AdminThemeToggle theme={theme} />
      <LogoutButton />
    </div>
  );
}

export function AdminSidebar({ siteName, email, theme, sidebar }: AdminSidebarProps) {
  const initial = Array.from(siteName)[0] ?? '';
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.mono} aria-hidden="true">
          {initial}
        </span>
        <span className={styles.label}>{siteName}</span>
      </div>
      <AdminNav />
      <AdminSidebarFooter email={email} theme={theme} />
      <AdminSidebarToggle sidebar={sidebar} />
    </aside>
  );
}
