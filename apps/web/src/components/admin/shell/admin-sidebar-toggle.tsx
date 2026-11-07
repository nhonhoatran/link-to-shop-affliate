import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { setSidebarState } from '@/app/admin/_lib/admin-preference-actions';
import type { SidebarState } from '@/app/admin/_lib/admin-preferences';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import styles from './admin-sidebar.module.css';

export function AdminSidebarToggle({ sidebar }: { sidebar: SidebarState }) {
  const expanded = sidebar === 'expanded';
  return (
    <form action={setSidebarState} className={styles.collapseForm}>
      <button type="submit" name="sidebar" value={expanded ? 'rail' : 'expanded'} className={styles.themeButton}>
        <DecorativeIcon icon={expanded ? PanelLeftClose : PanelLeftOpen} />
        <span className={styles.label}>{expanded ? 'Thu gọn menu' : 'Mở rộng menu'}</span>
      </button>
    </form>
  );
}
