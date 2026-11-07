'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_PATHS, loginInputSchema } from '@under30ss/shared';
import { useFormSubmit } from '@/hooks/admin/use-form-submit';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { apiFetch } from '@/lib/api-client-browser';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';
import { AdminFormField } from './admin-form-field';
import { FormError } from './field-error';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { pending, formError, fieldErrors, handle } = useFormSubmit({ redirectOnUnauthorized: false });

  const onSubmit = handle(loginInputSchema, () => ({ email, password }), async (data) => {
    await apiFetch(API_PATHS.auth.login, { method: 'POST', json: data });
    router.replace(ADMIN_PATHS.overview);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className={`${styles.panel} ${styles.narrow}`}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Đăng nhập</h1>
      </div>
      <FormError message={formError} />
      <AdminFormField id="login-email" label="Email" error={fieldErrors.email}>
        {(control) => (
          <input {...control} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
      </AdminFormField>
      <AdminFormField id="login-password" label="Mật khẩu" error={fieldErrors.password}>
        {(control) => (
          <input
            {...control}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </AdminFormField>
      <div className={formStyles.formActions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
          {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </div>
    </form>
  );
}
