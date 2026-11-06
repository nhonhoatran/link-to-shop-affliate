'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_PATHS, settingsInputSchema, type AdminSettingsDto, type ImageWithUrl } from '@under30ss/shared';
import { useFormSubmit } from '@/hooks/admin/use-form-submit';
import { apiFetch } from '@/lib/api-client-browser';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';
import { AdminFormField } from './admin-form-field';
import { FormError } from './field-error';
import { MediaDropzone } from './media-dropzone';
import { MediaThumb } from './media-thumb';
import { SaveStatusText } from './save-status-text';
import type { SaveStatus } from '@/hooks/admin/use-outfit-actions';

export function SettingsForm({ initial }: { initial: AdminSettingsDto }) {
  const [siteName, setSiteName] = useState(initial.siteName);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [uploadMaxMb, setUploadMaxMb] = useState(initial.uploadMaxMb?.toString() ?? '');
  const [ogImage, setOgImage] = useState<ImageWithUrl | undefined>(initial.ogImage);
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const { pending, formError, fieldErrors, handle } = useFormSubmit();

  const onSubmit = handle(
    settingsInputSchema,
    () => ({
      siteName,
      seoTitle,
      seoDescription,
      ...(ogImage ? { ogImage: { key: ogImage.key, width: ogImage.width, height: ogImage.height } } : {}),
      ...(uploadMaxMb.trim() === '' ? {} : { uploadMaxMb: Number(uploadMaxMb) }),
    }),
    async (data) => {
      await apiFetch(API_PATHS.admin.settings, { method: 'PUT', json: data });
      setDirty(false);
      setSaved(true);
      router.refresh();
    },
  );

  const edit = (setter: (value: string) => void) => (value: string) => {
    setDirty(true);
    setter(value);
  };

  const failed = formError !== null || Object.keys(fieldErrors).length > 0;
  const saveStatus: SaveStatus = pending ? 'saving' : failed ? 'error' : saved ? 'saved' : 'idle';

  return (
    <form onSubmit={onSubmit} noValidate className={styles.panel}>
      <FormError message={formError} />
      <AdminFormField id="settings-site-name" label="Tên site" error={fieldErrors.siteName}>
        {(control) => (
          <input {...control} value={siteName} maxLength={80} onChange={(e) => edit(setSiteName)(e.target.value)} />
        )}
      </AdminFormField>
      <AdminFormField id="settings-seo-title" label="Tiêu đề SEO mặc định" error={fieldErrors.seoTitle}>
        {(control) => (
          <input {...control} value={seoTitle} maxLength={120} onChange={(e) => edit(setSeoTitle)(e.target.value)} />
        )}
      </AdminFormField>
      <AdminFormField id="settings-seo-description" label="Mô tả SEO mặc định" error={fieldErrors.seoDescription}>
        {(control) => (
          <textarea
            {...control}
            rows={3}
            value={seoDescription}
            maxLength={300}
            onChange={(e) => edit(setSeoDescription)(e.target.value)}
          />
        )}
      </AdminFormField>
      <AdminFormField
        id="settings-upload-max"
        label="Giới hạn dung lượng ảnh tải lên (MB)"
        hint="Để trống để dùng giá trị mặc định của hệ thống"
        error={fieldErrors.uploadMaxMb}
      >
        {(control) => (
          <input
            {...control}
            type="number"
            min={1}
            step={1}
            value={uploadMaxMb}
            onChange={(e) => edit(setUploadMaxMb)(e.target.value)}
          />
        )}
      </AdminFormField>
      <MediaDropzone
        id="settings-og-image"
        kind="model"
        label="Ảnh chia sẻ (Facebook, Zalo)"
        error={fieldErrors.ogImage}
        onUploaded={(media) => {
          setDirty(true);
          setOgImage(media);
        }}
      />
      {ogImage ? (
        <>
          <MediaThumb image={ogImage} alt="Ảnh chia sẻ hiện tại" />
          <div className={styles.btnGroup}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => {
                setDirty(true);
                setOgImage(undefined);
              }}
            >
              Bỏ ảnh chia sẻ
            </button>
          </div>
        </>
      ) : null}
      <div className={formStyles.formActions}>
        <SaveStatusText status={saveStatus} dirty={dirty} />
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
          Lưu
        </button>
      </div>
    </form>
  );
}
