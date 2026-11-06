'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_PATHS, createAdminInputSchema } from '@under30ss/shared';
import { useFormSubmit } from '@/hooks/admin/use-form-submit';
import { apiFetch } from '@/lib/api-client-browser';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';
import { AdminFormField } from './admin-form-field';
import { AdminPanel } from './admin-panel';
import { FormError } from './field-error';
import { StatusMessage } from './save-status-text';

export function UserCreateForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [addedEmail, setAddedEmail] = useState<string | null>(null);
  const { pending, formError, fieldErrors, handle } = useFormSubmit();

  const onSubmit = handle(createAdminInputSchema, () => ({ email, password }), async (data) => {
    await apiFetch(API_PATHS.admin.admins, { method: 'POST', json: data });
    setAddedEmail(data.email);
    setEmail('');
    setPassword('');
    router.refresh();
  });

  const edit = (setter: (value: string) => void) => (value: string) => {
    setAddedEmail(null);
    setter(value);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <AdminPanel id="user-create" title="Thêm quản trị viên">
        <FormError message={formError} />
        <AdminFormField id="user-email" label="Email" error={fieldErrors.email}>
          {(control) => (
            <input
              {...control}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => edit(setEmail)(e.target.value)}
            />
          )}
        </AdminFormField>
        <AdminFormField
          id="user-password"
          label="Mật khẩu tạm"
          hint="Gửi mật khẩu này cho người dùng"
          error={fieldErrors.password}
        >
          {(control) => (
            <input
              {...control}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => edit(setPassword)(e.target.value)}
            />
          )}
        </AdminFormField>
        <div className={formStyles.formActions}>
          <StatusMessage>{addedEmail ? `Đã thêm ${addedEmail}` : ''}</StatusMessage>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
            {pending ? 'Đang thêm…' : 'Thêm quản trị viên'}
          </button>
        </div>
      </AdminPanel>
    </form>
  );
}
