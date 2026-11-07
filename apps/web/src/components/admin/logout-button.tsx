'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { API_PATHS } from '@under30ss/shared';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { LOGIN_PATH } from '@/lib/admin-paths';
import { apiFetch } from '@/lib/api-client-browser';
import sidebarStyles from './shell/admin-sidebar.module.css';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      await apiFetch(API_PATHS.auth.logout, { method: 'POST' });
    } catch {
      // Session may already be gone; the login page is the right place either way.
    }
    router.replace(LOGIN_PATH);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className={sidebarStyles.footerForm}>
      <button type="submit" className={sidebarStyles.themeButton} disabled={pending}>
        <DecorativeIcon icon={LogOut} />
        <span className={sidebarStyles.label}>{pending ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
      </button>
    </form>
  );
}
