'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { API_PATHS, loginInputSchema } from '@under30ss/shared';
import { useFormSubmit } from '@/hooks/admin/use-form-submit';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { apiFetch } from '@/lib/api-client-browser';
import styles from './admin.module.css';
import { AdminFormField } from './admin-form-field';
import { FormError } from './field-error';
import loginStyles from './login-form.module.css';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { pending, formError, fieldErrors, handle } = useFormSubmit({ redirectOnUnauthorized: false });

  const onSubmit = handle(loginInputSchema, () => ({ email, password }), async (data) => {
    await apiFetch(API_PATHS.auth.login, { method: 'POST', json: data });
    router.replace(ADMIN_PATHS.overview);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className={loginStyles.form}>
      <div className={loginStyles.header}>
        <h1 className={loginStyles.title}>Đăng nhập</h1>
        <p className={loginStyles.lead}>Dùng tài khoản quản trị để tiếp tục.</p>
      </div>
      <FormError message={formError} />
      <AdminFormField id="login-email" label="Email" error={fieldErrors.email}>
        {(control) => (
          <input {...control} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
      </AdminFormField>
      <AdminFormField id="login-password" label="Mật khẩu" error={fieldErrors.password}>
        {(control) => (
          <div className={loginStyles.passwordWrap}>
            <input
              {...control}
              className={`${control.className} ${loginStyles.passwordInput}`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={loginStyles.reveal}
              aria-label="Hiện mật khẩu"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
            </button>
          </div>
        )}
      </AdminFormField>
      <button type="submit" className={`${styles.btn} ${styles.btnPrimary} ${loginStyles.submit}`} disabled={pending}>
        {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
