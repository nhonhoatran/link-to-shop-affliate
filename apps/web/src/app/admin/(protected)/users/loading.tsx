import { AdminSkeleton } from '@/components/admin/shell/admin-skeleton';
import styles from '@/components/admin/admin.module.css';

export default function AdminUsersLoading() {
  return (
    <div className={styles.narrow}>
      <AdminSkeleton variant="table" count={4} />
    </div>
  );
}
