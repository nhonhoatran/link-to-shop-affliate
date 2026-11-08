'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  API_PATHS,
  apiUrl,
  collectionInputSchema,
  slugifyVietnamese,
  type AdminCollectionDto,
  type CollectionResponse,
  type OutfitStatus,
} from '@under30ss/shared';
import { useFormSubmit } from '@/hooks/admin/use-form-submit';
import type { SaveStatus } from '@/hooks/admin/use-outfit-actions';
import { useSaveShortcut } from '@/hooks/admin/use-save-shortcut';
import { useUnsavedChangesGuard } from '@/hooks/admin/use-unsaved-changes-guard';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { apiFetch } from '@/lib/api-client-browser';
import styles from '../admin.module.css';
import formStyles from '../admin-form.module.css';
import { AdminFormField } from '../admin-form-field';
import { ConfirmDialog } from '../confirm-dialog';
import { FormError } from '../field-error';
import { MediaDropzone } from '../media-dropzone';
import { MediaThumb } from '../media-thumb';
import { SaveStatusText } from '../save-status-text';
import { useAdminToast } from '../shell/use-admin-toast';
import {
  emptyCollectionValues,
  fromCollection,
  snapshotOfCollection,
  toCollectionInput,
  withCoverMessage,
  type CollectionFormValues,
} from './collection-form-state';

export function CollectionForm({ initial }: { initial?: AdminCollectionDto }) {
  const router = useRouter();
  const toast = useAdminToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<CollectionFormValues>(() => (initial ? fromCollection(initial) : emptyCollectionValues));
  const [slugEdited, setSlugEdited] = useState(initial !== undefined);
  const [saved, setSaved] = useState(() => snapshotOfCollection(values));
  const [everSaved, setEverSaved] = useState(false);
  const { pending, formError, fieldErrors, handle } = useFormSubmit();

  const dirty = snapshotOfCollection(values) !== saved;
  const guard = useUnsavedChangesGuard(dirty, (href) => router.push(href));
  useSaveShortcut(() => {
    if (!pending) formRef.current?.requestSubmit();
  });

  const errors = useMemo(() => withCoverMessage(fieldErrors, values), [fieldErrors, values]);
  useEffect(() => {
    if (Object.keys(fieldErrors).length > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [fieldErrors]);

  const patch = (change: Partial<CollectionFormValues>) => setValues((current) => ({ ...current, ...change }));

  const onSubmit = handle(collectionInputSchema, () => toCollectionInput(values), async (data) => {
    if (initial) {
      await apiFetch(apiUrl.adminCollection(initial.id), { method: 'PUT', json: data });
      setSaved(snapshotOfCollection(values));
      setEverSaved(true);
      toast.success('Đã lưu bộ sưu tập');
      router.refresh();
      return;
    }
    const created = await apiFetch<CollectionResponse>(API_PATHS.admin.collections, { method: 'POST', json: data });
    setSaved(snapshotOfCollection(values));
    toast.success('Đã tạo bộ sưu tập');
    router.replace(ADMIN_PATHS.collectionEdit(created.id));
  });

  const failed = formError !== null || Object.keys(fieldErrors).length > 0;
  const saveStatus: SaveStatus = pending ? 'saving' : failed ? 'error' : everSaved ? 'saved' : 'idle';

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className={styles.panel}>
      <FormError message={formError} />
      <AdminFormField id="collection-name" label="Tên bộ sưu tập" error={errors.name}>
        {(control) => (
          <input
            {...control}
            value={values.name}
            maxLength={80}
            onChange={(event) => {
              const name = event.target.value;
              patch(slugEdited ? { name } : { name, slug: slugifyVietnamese(name) });
            }}
          />
        )}
      </AdminFormField>
      <AdminFormField
        id="collection-slug"
        label="Đường dẫn (slug)"
        hint={initial ? 'Đổi slug sẽ đổi địa chỉ trang' : 'Tự tạo từ tên, có thể sửa'}
        error={errors.slug}
      >
        {(control) => (
          <input
            {...control}
            value={values.slug}
            maxLength={80}
            onChange={(event) => {
              setSlugEdited(true);
              patch({ slug: event.target.value });
            }}
          />
        )}
      </AdminFormField>
      <AdminFormField id="collection-description" label="Mô tả" error={errors.description}>
        {(control) => (
          <textarea
            {...control}
            rows={3}
            value={values.description}
            maxLength={500}
            onChange={(event) => patch({ description: event.target.value })}
          />
        )}
      </AdminFormField>
      <MediaDropzone
        id="collection-cover"
        kind="model"
        label="Ảnh bìa"
        error={errors.coverImage}
        onUploaded={(coverImage) => patch({ coverImage })}
      />
      {values.coverImage ? (
        <>
          <MediaThumb image={values.coverImage} alt="Ảnh bìa hiện tại" />
          <div className={styles.btnGroup}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => patch({ coverImage: undefined })}>
              Bỏ ảnh bìa
            </button>
          </div>
        </>
      ) : null}
      <AdminFormField id="collection-status" label="Trạng thái" error={errors.status}>
        {(control) => (
          <select {...control} value={values.status} onChange={(event) => patch({ status: event.target.value as OutfitStatus })}>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã đăng</option>
          </select>
        )}
      </AdminFormField>
      <AdminFormField id="collection-seo" label="Mô tả SEO" error={errors.seoDescription}>
        {(control) => (
          <textarea
            {...control}
            rows={3}
            value={values.seoDescription}
            maxLength={300}
            onChange={(event) => patch({ seoDescription: event.target.value })}
          />
        )}
      </AdminFormField>
      <div className={formStyles.formActions}>
        <SaveStatusText status={saveStatus} dirty={dirty} />
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
          Lưu
        </button>
      </div>
      <ConfirmDialog
        open={guard.pendingHref !== null}
        title="Rời trang khi chưa lưu?"
        message="Các thay đổi chưa lưu sẽ mất."
        confirmLabel="Rời trang"
        cancelLabel="Ở lại"
        danger
        onCancel={guard.cancelLeave}
        onConfirm={guard.confirmLeave}
      />
    </form>
  );
}
