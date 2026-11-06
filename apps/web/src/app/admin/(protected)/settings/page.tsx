import type { Metadata } from 'next';
import { SettingsForm } from '@/components/admin/settings-form';
import styles from '@/components/admin/admin.module.css';
import { getAdminSettings } from '../../_lib/admin-api';

export const metadata: Metadata = { title: 'Cài đặt' };

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();
  return (
    <div className={styles.narrow}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Cài đặt</h1>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
