'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';

const LINKS = [
  { href: '/admin', label: 'Outfit', match: (path: string) => path === '/admin' || path.startsWith('/admin/outfits') },
  { href: '/admin/settings', label: 'Cài đặt', match: (path: string) => path.startsWith('/admin/settings') },
  { href: '/admin/users', label: 'Quản trị viên', match: (path: string) => path.startsWith('/admin/users') },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Quản trị" className={styles.nav}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={styles.navLink}
          aria-current={link.match(pathname) ? 'page' : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
