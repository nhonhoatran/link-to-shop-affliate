'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiUrl, type AdminUserDto } from '@under30ss/shared';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import { apiFetch } from '@/lib/api-client-browser';
import { formatAdminDate } from '@/lib/format-admin-date';
import styles from './admin.module.css';
import listStyles from './admin-list.module.css';
import { ConfirmDialog } from './confirm-dialog';
import { describeApiFailure } from './describe-api-failure';
import { FormError } from './field-error';

interface UserListProps {
  users: AdminUserDto[];
  currentUserId: string;
  timeZone: string;
}

export function UserList({ users, currentUserId, timeZone }: UserListProps) {
  const router = useRouter();
  const redirectToLogin = useRedirectOnUnauthorized();
  const [target, setTarget] = useState<AdminUserDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (user: AdminUserDto) => {
    setTarget(null);
    setError(null);
    setDeletingId(user.id);
    try {
      await apiFetch(apiUrl.adminAdmin(user.id), { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      if (!redirectToLogin(err)) setError(describeApiFailure(err).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.panel}>
      <FormError message={error} />
      <table className={listStyles.table} role="table">
        <caption className={styles.srOnly}>Danh sách quản trị viên</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Email</th>
            <th scope="col" role="columnheader">Ngày tạo</th>
            <th scope="col" role="columnheader">
              <span className={styles.srOnly}>Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {users.map((user) => (
            <tr key={user.id} role="row">
              <td role="cell" data-label="">{user.email}</td>
              <td role="cell" data-label="Ngày tạo">{formatAdminDate(user.createdAt, timeZone)}</td>
              <td role="cell" data-label="">
                {user.id === currentUserId ? (
                  <span className={styles.hint}>Tài khoản của bạn</span>
                ) : (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    aria-label={deletingId === user.id ? undefined : `Xoá quản trị viên ${user.email}`}
                    disabled={deletingId !== null}
                    onClick={() => setTarget(user)}
                  >
                    {deletingId === user.id ? 'Đang xoá…' : 'Xoá'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmDialog
        open={target !== null}
        title="Xoá quản trị viên này?"
        message={`${target?.email ?? ''} sẽ không đăng nhập được nữa.`}
        confirmLabel="Xoá quản trị viên"
        danger
        onCancel={() => setTarget(null)}
        onConfirm={() => target && void remove(target)}
      />
    </div>
  );
}
