'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IMPORT_API_PATHS, type ImportTokenDto } from '@under30ss/shared';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import { apiFetch } from '@/lib/api-client-browser';
import { formatAdminDate } from '@/lib/format-admin-date';
import { useAdminToast } from './shell/use-admin-toast';
import { ConfirmDialog } from './confirm-dialog';
import { describeApiFailure } from './describe-api-failure';
import { FormError } from './field-error';
import styles from './admin.module.css';
import listStyles from './admin-list.module.css';

interface Props { items: ImportTokenDto[]; timeZone: string; nowIso: string }

export function ImportTokenList({ items, timeZone, nowIso }: Props) {
  const router = useRouter();
  const redirectOnUnauthorized = useRedirectOnUnauthorized();
  const toast = useAdminToast();
  const [target, setTarget] = useState<ImportTokenDto | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revoke = async (record: ImportTokenDto) => {
    setTarget(null);
    setPending(record.id);
    setError(null);
    try {
      await apiFetch(IMPORT_API_PATHS.token(record.id), { method: 'DELETE' });
      toast.success('Đã thu hồi token');
      router.refresh();
    } catch (err) {
      if (!redirectOnUnauthorized(err)) setError(describeApiFailure(err).message);
    } finally {
      setPending(null);
    }
  };
  const status = (record: ImportTokenDto) => record.revokedAt ? 'Đã thu hồi' : record.expiresAt <= nowIso ? 'Hết hạn' : 'Đang dùng';
  return (
    <div className={styles.panel}>
      <FormError message={error} />
      {items.length ? (
        <table className={listStyles.table} role="table">
          <caption className={styles.srOnly}>Token nhập nháp của tài khoản hiện tại</caption>
          <thead role="rowgroup"><tr role="row">
            <th scope="col" role="columnheader">Thiết bị</th><th scope="col" role="columnheader">Hạn dùng</th>
            <th scope="col" role="columnheader">Trạng thái</th><th scope="col" role="columnheader"><span className={styles.srOnly}>Thao tác</span></th>
          </tr></thead>
          <tbody role="rowgroup">{items.map((record) => (
            <tr key={record.id} role="row">
              <td role="cell" data-label="Thiết bị">{record.label}<br /><span className={styles.hint}>{record.prefix}…</span></td>
              <td role="cell" data-label="Hạn dùng">{formatAdminDate(record.expiresAt, timeZone)}</td>
              <td role="cell" data-label="Trạng thái">{status(record)}</td>
              <td role="cell" data-label="">
                {!record.revokedAt ? <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={pending !== null}
                  aria-label={`Thu hồi token ${record.label}`} onClick={() => setTarget(record)}>{pending === record.id ? 'Đang thu hồi…' : 'Thu hồi'}</button> : null}
              </td>
            </tr>
          ))}</tbody>
        </table>
      ) : <p className={styles.hint}>Chưa có token nhập desktop.</p>}
      <ConfirmDialog open={target !== null} title="Thu hồi token này?" message={`${target?.label ?? ''} sẽ không gửi thêm nháp được nữa.`}
        confirmLabel="Thu hồi token" danger onCancel={() => setTarget(null)} onConfirm={() => target && void revoke(target)} />
    </div>
  );
}
