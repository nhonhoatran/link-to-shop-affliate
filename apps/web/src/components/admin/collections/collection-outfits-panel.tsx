'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiUrl, type AdminOutfitListItemDto, type CollectionOutfitsRequest } from '@under30ss/shared';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { apiFetch } from '@/lib/api-client-browser';
import styles from '../admin.module.css';
import listStyles from '../admin-list.module.css';
import formStyles from '../admin-form.module.css';
import { AdminPanel } from '../admin-panel';
import { describeApiFailure } from '../describe-api-failure';
import { FormError } from '../field-error';
import { OutfitPicker } from '../pickers/outfit-picker';
import type { PickerItem } from '../pickers/use-entity-search';
import { useAdminToast } from '../shell/use-admin-toast';
import { collectionOutfitsPageHref } from './collection-list-query';
import { CollectionPagination } from './collection-pagination';
import collectionStyles from './collections.module.css';

interface CollectionOutfitsPanelProps {
  collectionId: string;
  items: AdminOutfitListItemDto[];
  total: number;
  page: number;
  totalPages: number;
}

export function CollectionOutfitsPanel({ collectionId, items, total, page, totalPages }: CollectionOutfitsPanelProps) {
  const router = useRouter();
  const toast = useAdminToast();
  const redirectToLogin = useRedirectOnUnauthorized();
  const { dialogRef, open, close, onDialogClose, onDialogClick } = useModalDialog();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<PickerItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (request: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await request();
      toast.success(success);
      router.refresh();
      return true;
    } catch (err) {
      if (!redirectToLogin(err)) setError(describeApiFailure(err).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => {
    setPicked([]);
    setError(null);
    setAdding(true);
    open();
  };

  const confirmAdd = async () => {
    const body: CollectionOutfitsRequest = { outfitIds: picked.map((outfit) => outfit.id) };
    const added = await run(
      () => apiFetch(apiUrl.adminCollectionOutfits(collectionId), { method: 'POST', json: body }),
      `Đã thêm ${picked.length} outfit vào bộ sưu tập`,
    );
    if (added) close();
  };

  const remove = (outfit: AdminOutfitListItemDto) =>
    run(
      () => apiFetch(apiUrl.adminCollectionOutfit(collectionId, outfit.id), { method: 'DELETE' }),
      'Đã gỡ outfit khỏi bộ sưu tập',
    );

  return (
    <AdminPanel
      id="collection-outfits"
      title={`Outfit trong bộ sưu tập (${total})`}
      actions={
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={openPicker}>
          Thêm outfit
        </button>
      }
    >
      <FormError message={adding ? null : error} />
      <table className={listStyles.table} role="table">
        <caption className={styles.srOnly}>Outfit trong bộ sưu tập</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">
              <span className={styles.srOnly}>Ảnh</span>
            </th>
            <th scope="col" role="columnheader">Tên</th>
            <th scope="col" role="columnheader">Trạng thái</th>
            <th scope="col" role="columnheader">
              <span className={styles.srOnly}>Thao tác</span>
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {items.length === 0 ? (
            <tr role="row">
              <td colSpan={4} role="cell" className={listStyles.emptyRow}>
                Chưa có outfit nào. Bấm &quot;Thêm outfit&quot; để chọn.
              </td>
            </tr>
          ) : (
            items.map((outfit) => (
              <tr key={outfit.id} role="row" className={listStyles.rowWithThumb}>
                <td role="cell" className={listStyles.cellThumb} data-label="">
                  <div className={listStyles.thumb}>
                    <Image src={outfit.modelImageUrl} alt="" fill sizes="48px" />
                  </div>
                </td>
                <td role="cell" data-label="">
                  <Link href={ADMIN_PATHS.outfitEdit(outfit.id)} className={listStyles.titleLink}>
                    {outfit.title}
                  </Link>
                </td>
                <td role="cell" data-label="Trạng thái">
                  <span className={`${listStyles.badge} ${outfit.status === 'published' ? listStyles.badgeOk : ''}`}>
                    {outfit.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
                  </span>
                </td>
                <td role="cell" data-label="">
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    aria-label={`Gỡ ${outfit.title} khỏi bộ sưu tập`}
                    disabled={busy}
                    onClick={() => void remove(outfit)}
                  >
                    Gỡ
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <CollectionPagination page={page} totalPages={totalPages} hrefForPage={(target) => collectionOutfitsPageHref(collectionId, target)} label="Phân trang outfit" />
      <dialog
        ref={dialogRef}
        className={`${formStyles.dialog} ${collectionStyles.pickerDialog}`}
        aria-label="Thêm outfit vào bộ sưu tập"
        onClose={() => {
          onDialogClose();
          setAdding(false);
        }}
        onClick={onDialogClick}
      >
        {adding ? (
          <>
            <OutfitPicker selected={picked} onChange={setPicked} />
            <FormError message={error} />
            <div className={formStyles.dialogActions}>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={close}>
                Huỷ
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={busy || picked.length === 0}
                onClick={() => void confirmAdd()}
              >
                {busy ? 'Đang thêm…' : 'Thêm vào bộ sưu tập'}
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </AdminPanel>
  );
}
