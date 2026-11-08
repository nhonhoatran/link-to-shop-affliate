'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiUrl, type CollectionUsage } from '@under30ss/shared';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { apiFetch } from '@/lib/api-client-browser';
import styles from '../admin.module.css';
import { ConfirmDialog } from '../confirm-dialog';
import { describeApiFailure } from '../describe-api-failure';
import { FormError } from '../field-error';
import { useAdminToast } from '../shell/use-admin-toast';

interface CollectionDeleteActionProps {
  id: string;
  name: string;
  usage: CollectionUsage;
}

export const buildDeleteMessage = (name: string, { outfitCount, usedInDraft, usedInPublished }: CollectionUsage): string => {
  const parts = [
    `Xoá bộ sưu tập "${name}"?`,
    outfitCount > 0
      ? `Đang có ${outfitCount} outfit trong bộ sưu tập này. Các outfit vẫn được giữ, chỉ gỡ khỏi bộ sưu tập.`
      : 'Bộ sưu tập này chưa có outfit.',
  ];
  if (usedInDraft || usedInPublished) parts.push('Khối dùng bộ sưu tập này ở trang chủ sẽ tự ẩn.');
  return parts.join(' ');
};

export function CollectionDeleteAction({ id, name, usage }: CollectionDeleteActionProps) {
  const router = useRouter();
  const toast = useAdminToast();
  const redirectToLogin = useRedirectOnUnauthorized();
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setConfirming(false);
    setError(null);
    setRemoving(true);
    try {
      await apiFetch(apiUrl.adminCollection(id), { method: 'DELETE' });
      toast.success('Đã xoá bộ sưu tập');
      router.replace(ADMIN_PATHS.collections);
    } catch (err) {
      if (!redirectToLogin(err)) setError(describeApiFailure(err).message);
      setRemoving(false);
    }
  };

  return (
    <>
      <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={removing} onClick={() => setConfirming(true)}>
        {removing ? 'Đang xoá…' : 'Xoá bộ sưu tập'}
      </button>
      <FormError message={error} />
      <ConfirmDialog
        open={confirming}
        title="Xoá bộ sưu tập"
        message={buildDeleteMessage(name, usage)}
        confirmLabel="Xoá"
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
