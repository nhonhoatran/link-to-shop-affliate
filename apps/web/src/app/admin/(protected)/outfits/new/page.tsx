import type { Metadata } from 'next';
import Link from 'next/link';
import { OutfitCreateForm } from '@/components/admin/outfit-create-form';
import styles from '@/components/admin/admin.module.css';

export const metadata: Metadata = { title: 'Tạo outfit' };

export default function AdminOutfitNewPage() {
  return (
    <div className={styles.narrow}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Tạo outfit</h1>
        <Link href="/admin" className={`${styles.btn} ${styles.btnSecondary}`}>
          Quay lại danh sách
        </Link>
      </div>
      <OutfitCreateForm />
    </div>
  );
}
