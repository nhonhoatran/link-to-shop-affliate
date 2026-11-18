'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IMPORT_API_PATHS, createImportTokenResponseSchema, createImportTokenSchema } from '@under30ss/shared';
import { useFormSubmit } from '@/hooks/admin/use-form-submit';
import { apiFetch } from '@/lib/api-client-browser';
import { AdminPanel } from './admin-panel';
import { AdminFormField } from './admin-form-field';
import { FormError } from './field-error';
import { StatusMessage } from './save-status-text';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';

const isoDate = (value: string): string => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : value;
};

export function ImportTokenCreateForm() {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const { pending, formError, fieldErrors, handle } = useFormSubmit();
  const submit = handle(createImportTokenSchema, () => ({ label, expiresAt: isoDate(expiresAt) }), async (input) => {
    setToken(null);
    const result = createImportTokenResponseSchema.parse(await apiFetch(IMPORT_API_PATHS.tokens, { method: 'POST', json: input }));
    setToken(result.token);
    setLabel('');
    setExpiresAt('');
    setCopyStatus('');
    router.refresh();
  });
  const copy = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopyStatus('Đã sao chép token');
    } catch {
      setCopyStatus('Không truy cập được clipboard. Chọn token và sao chép thủ công.');
    }
  };
  return (
    <AdminPanel id="import-token-create" title="Tạo token cho ứng dụng desktop">
      <form onSubmit={submit} noValidate>
        <FormError message={formError} />
        <AdminFormField id="import-token-label" label="Tên thiết bị" error={fieldErrors.label}>
          {(control) => <input {...control} autoComplete="off" value={label} onChange={(event) => { setToken(null); setCopyStatus(''); setLabel(event.target.value); }} />}
        </AdminFormField>
        <AdminFormField id="import-token-expiry" label="Hạn dùng" hint="Chọn ngày giờ theo đồng hồ máy đang dùng." error={fieldErrors.expiresAt}>
          {(control) => <input {...control} type="datetime-local" value={expiresAt} onChange={(event) => { setToken(null); setCopyStatus(''); setExpiresAt(event.target.value); }} />}
        </AdminFormField>
        <div className={formStyles.formActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending} type="submit">{pending ? 'Đang tạo…' : 'Tạo token'}</button>
        </div>
      </form>
      {token ? (
        <div className={styles.stack}>
          <AdminFormField id="import-token-secret" label="Token vừa tạo" hint="Chỉ hiện một lần. Dán vào ứng dụng desktop, rồi ẩn token tại đây.">
            {(control) => <textarea {...control} readOnly rows={3} spellCheck={false} autoComplete="off" value={token} />}
          </AdminFormField>
          <div className={styles.btnGroup}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => void copy()}>Sao chép token</button>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => { setToken(null); setCopyStatus(''); }}>Ẩn token</button>
          </div>
          <StatusMessage>{copyStatus}</StatusMessage>
        </div>
      ) : null}
    </AdminPanel>
  );
}
