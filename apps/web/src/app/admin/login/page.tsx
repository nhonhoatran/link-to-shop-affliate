import type { Metadata } from 'next';
import { LoginForm } from '@/components/admin/login-form';
import styles from '@/components/admin/admin.module.css';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function AdminLoginPage() {
  return (
    <main className={styles.main}>
      <LoginForm />
    </main>
  );
}
