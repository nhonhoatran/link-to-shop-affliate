import { AdminSkeleton } from '@/components/admin/shell/admin-skeleton';
import styles from '@/components/admin/admin.module.css';

export default function AdminCollectionsLoading() {
  return (
    <div className={styles.container}>
      <AdminSkeleton variant="table" count={8} />
    </div>
  );
}
