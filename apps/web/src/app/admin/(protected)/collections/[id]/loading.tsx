import { AdminSkeleton } from '@/components/admin/shell/admin-skeleton';
import styles from '@/components/admin/admin.module.css';

export default function AdminCollectionEditLoading() {
  return (
    <div className={styles.narrow}>
      <AdminSkeleton variant="cards" count={4} />
    </div>
  );
}
