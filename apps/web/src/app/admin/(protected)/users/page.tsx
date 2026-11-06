import type { Metadata } from 'next';
import { API_PATHS, type AdminListResponse } from '@under30ss/shared';
import { UserCreateForm } from '@/components/admin/user-create-form';
import { UserList } from '@/components/admin/user-list';
import styles from '@/components/admin/admin.module.css';
import { getWebEnv } from '@/lib/web-env';
import { adminGet, getCurrentAdmin } from '../../_lib/admin-api';

export const metadata: Metadata = { title: 'Quản trị viên' };

export default async function AdminUsersPage() {
  const [me, list] = await Promise.all([getCurrentAdmin(), adminGet<AdminListResponse>(API_PATHS.admin.admins)]);
  return (
    <div className={styles.narrow}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Quản trị viên</h1>
      </div>
      <div className={styles.stack}>
        <UserList users={list.items} currentUserId={me.id} timeZone={getWebEnv().ADMIN_TIME_ZONE} />
        <UserCreateForm />
      </div>
    </div>
  );
}
