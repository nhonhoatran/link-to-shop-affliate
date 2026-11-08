import type { Metadata } from 'next';
import Link from 'next/link';
import { CollectionForm } from '@/components/admin/collections/collection-form';
import styles from '@/components/admin/admin.module.css';
import { ADMIN_PATHS } from '@/lib/admin-paths';

export const metadata: Metadata = { title: 'Tạo bộ sưu tập' };

export default function AdminCollectionNewPage() {
  return (
    <div className={styles.narrow}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Tạo bộ sưu tập</h1>
        <Link href={ADMIN_PATHS.collections} className={`${styles.btn} ${styles.btnSecondary}`}>
          Quay lại danh sách
        </Link>
      </div>
      <CollectionForm />
    </div>
  );
}
