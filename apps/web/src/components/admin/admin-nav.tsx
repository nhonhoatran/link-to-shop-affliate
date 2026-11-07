'use client';

import { LayoutDashboard, Package, Settings, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import styles from './shell/admin-sidebar.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const ITEMS: NavItem[] = [
  { href: ADMIN_PATHS.overview, label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: ADMIN_PATHS.outfits, label: 'Outfit', icon: Package },
  { href: ADMIN_PATHS.settings, label: 'Cài đặt', icon: Settings },
  { href: ADMIN_PATHS.users, label: 'Quản trị viên', icon: Users },
];

const isActive = (item: NavItem, pathname: string) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

/** Same list for sidebar, rail and drawer; rail hides the text visually (CSS), never from assistive tech. */
export function AdminNav({ label = 'Quản trị' }: { label?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={styles.nav}>
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={styles.link}
          data-tip={item.label}
          aria-current={isActive(item, pathname) ? 'page' : undefined}
        >
          <DecorativeIcon icon={item.icon} />
          <span className={styles.label}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
