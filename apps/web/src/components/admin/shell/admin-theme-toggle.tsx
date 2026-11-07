import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { setAdminTheme } from '@/app/admin/_lib/admin-preference-actions';
import type { AdminTheme } from '@/app/admin/_lib/admin-preferences';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import adminStyles from '../admin.module.css';
import styles from './admin-sidebar.module.css';

const OPTIONS: { value: AdminTheme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Sáng', icon: Sun },
  { value: 'dark', label: 'Tối', icon: Moon },
  { value: 'system', label: 'Theo hệ thống', icon: Monitor },
];

/** Plain form + Server Action so the choice also works without JavaScript. */
export function AdminThemeToggle({ theme }: { theme: AdminTheme }) {
  return (
    <form action={setAdminTheme} role="group" aria-label="Giao diện" className={styles.themeGroup}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="submit"
          name="theme"
          value={option.value}
          title={option.label}
          aria-pressed={theme === option.value}
          className={styles.themeButton}
        >
          <DecorativeIcon icon={option.icon} />
          <span className={adminStyles.srOnly}>{option.label}</span>
        </button>
      ))}
    </form>
  );
}
