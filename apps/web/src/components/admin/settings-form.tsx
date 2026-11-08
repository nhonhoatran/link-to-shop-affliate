'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { API_PATHS, settingsInputSchema, type AdminSettingsDto } from '@under30ss/shared';
import { useAdminToast } from '@/components/admin/shell/use-admin-toast';
import { useFormSubmit } from '@/hooks/admin/use-form-submit';
import type { SaveStatus } from '@/hooks/admin/use-outfit-actions';
import { apiFetch } from '@/lib/api-client-browser';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';
import { AdminFormField } from './admin-form-field';
import { AdminPanel } from './admin-panel';
import { FormError } from './field-error';
import { MediaDropzone } from './media-dropzone';
import { MediaThumb } from './media-thumb';
import { SaveStatusText } from './save-status-text';
import { SettingsAnnouncementFields } from './settings/settings-announcement-fields';
import { SettingsCollectionsNavFields } from './settings/settings-collections-nav-fields';
import { SettingsFooterColumnsEditor } from './settings/settings-footer-columns-editor';
import { localizeSettingsErrors } from './settings/settings-form-errors';
import { fromAdminSettings, toSettingsInput, type SettingsFormState } from './settings/settings-form-state';
import { SettingsSocialLinksEditor } from './settings/settings-social-links-editor';
import { useFocusFirstInvalid } from './settings/use-focus-first-invalid';
import { SettingsListingFields } from './settings-listing-fields';

export function SettingsForm({ initial }: { initial: AdminSettingsDto }) {
  const [state, setState] = useState<SettingsFormState>(() => fromAdminSettings(initial));
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const { pending, formError, fieldErrors, handle } = useFormSubmit();
  const toast = useAdminToast();
  useFocusFirstInvalid(formRef, fieldErrors);
  const errors = useMemo(() => localizeSettingsErrors(fieldErrors, state), [fieldErrors, state]);

  const change = (patch: Partial<SettingsFormState>) => {
    setDirty(true);
    setState((current) => ({ ...current, ...patch }));
  };

  const onSubmit = handle(
    settingsInputSchema,
    () => toSettingsInput(state),
    async (data) => {
      await apiFetch(API_PATHS.admin.settings, { method: 'PUT', json: data });
      setDirty(false);
      setSaved(true);
      toast.success('Đã lưu cài đặt');
      router.refresh();
    },
  );

  const failed = formError !== null || Object.keys(fieldErrors).length > 0;
  const saveStatus: SaveStatus = pending ? 'saving' : failed ? 'error' : saved ? 'saved' : 'idle';

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className={styles.stack}>
      <FormError message={formError} />
      <AdminPanel id="settings-site" title="Thông tin site">
        <AdminFormField id="settings-site-name" label="Tên site" error={errors.siteName}>
          {(control) => (
            <input {...control} value={state.siteName} maxLength={80} onChange={(e) => change({ siteName: e.target.value })} />
          )}
        </AdminFormField>
        <AdminFormField id="settings-seo-title" label="Tiêu đề SEO mặc định" error={errors.seoTitle}>
          {(control) => (
            <input {...control} value={state.seoTitle} maxLength={120} onChange={(e) => change({ seoTitle: e.target.value })} />
          )}
        </AdminFormField>
        <AdminFormField id="settings-seo-description" label="Mô tả SEO mặc định" error={errors.seoDescription}>
          {(control) => (
            <textarea
              {...control}
              rows={3}
              value={state.seoDescription}
              maxLength={300}
              onChange={(e) => change({ seoDescription: e.target.value })}
            />
          )}
        </AdminFormField>
        <AdminFormField
          id="settings-upload-max"
          label="Giới hạn dung lượng ảnh tải lên (MB)"
          hint="Để trống để dùng giá trị mặc định của hệ thống"
          error={errors.uploadMaxMb}
        >
          {(control) => (
            <input
              {...control}
              type="number"
              min={1}
              step={1}
              value={state.uploadMaxMb}
              onChange={(e) => change({ uploadMaxMb: e.target.value })}
            />
          )}
        </AdminFormField>
        <MediaDropzone
          id="settings-og-image"
          kind="model"
          label="Ảnh chia sẻ (Facebook, Zalo)"
          error={errors.ogImage}
          onUploaded={(media) => change({ ogImage: media })}
        />
        {state.ogImage ? (
          <>
            <MediaThumb image={state.ogImage} alt="Ảnh chia sẻ hiện tại" />
            <div className={styles.btnGroup}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => change({ ogImage: undefined })}
              >
                Bỏ ảnh chia sẻ
              </button>
            </div>
          </>
        ) : null}
      </AdminPanel>
      <AdminPanel id="settings-announcement" title="Dải thông báo">
        <SettingsAnnouncementFields
          values={state.announcement}
          errors={errors}
          onChange={(patch) => change({ announcement: { ...state.announcement, ...patch } })}
        />
      </AdminPanel>
      <AdminPanel id="settings-listing" title="Danh sách">
        <SettingsListingFields
          values={state}
          errors={errors}
          onChange={(name, value) => change({ [name]: value })}
        />
      </AdminPanel>
      <AdminPanel id="settings-collections" title="Bộ sưu tập">
        <SettingsCollectionsNavFields
          enabled={state.collectionsNavEnabled}
          label={state.collectionsLabel}
          errors={errors}
          onEnabledChange={(collectionsNavEnabled) => change({ collectionsNavEnabled })}
          onLabelChange={(collectionsLabel) => change({ collectionsLabel })}
        />
      </AdminPanel>
      <AdminPanel id="settings-footer" title="Chân trang">
        <SettingsFooterColumnsEditor columns={state.columns} errors={errors} onChange={(columns) => change({ columns })} />
        <SettingsSocialLinksEditor rows={state.social} errors={errors} onChange={(social) => change({ social })} />
      </AdminPanel>
      <div className={formStyles.formActions}>
        <SaveStatusText status={saveStatus} dirty={dirty} />
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
          Lưu
        </button>
      </div>
    </form>
  );
}
