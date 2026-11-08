import type { Metadata } from 'next';
import { LoginForm } from '@/components/admin/login-form';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import styles from './login-page.module.css';

export const metadata: Metadata = { title: 'Đăng nhập' };

// No session yet, so the public settings are the only source of the site name.
const loadSiteName = async (): Promise<string | null> => {
  try {
    return (await getPublicSettings()).siteName;
  } catch {
    return null;
  }
};

export default async function AdminLoginPage() {
  const siteName = await loadSiteName();
  return (
    <main className={styles.page}>
      <div className={styles.brand}>
        <p className={styles.eyebrow}>Khu quản trị</p>
        <p className={styles.wordmark}>{siteName ?? 'Quản trị'}</p>
      </div>
      <div className={styles.formSide}>
        <LoginForm />
      </div>
    </main>
  );
}
