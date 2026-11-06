import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import styles from '@/components/admin/admin.module.css';

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s · Quản trị' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className={styles.root}>{children}</div>;
}
