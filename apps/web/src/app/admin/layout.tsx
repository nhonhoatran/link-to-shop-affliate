import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import shellStyles from '@/components/admin/shell/admin-shell.module.css';
import { readAdminTheme } from './_lib/admin-preferences';

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s · Quản trị' },
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const theme = readAdminTheme(await cookies());
  return (
    <div className={shellStyles.themeRoot} data-theme={theme}>
      {children}
    </div>
  );
}
