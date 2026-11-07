import { AdminSkeleton } from '@/components/admin/shell/admin-skeleton';
import styles from '@/components/admin/admin.module.css';

export default function AdminSettingsLoading() {
  return (
    <div className={styles.narrow}>
      <AdminSkeleton variant="lines" count={8} />
    </div>
  );
}
