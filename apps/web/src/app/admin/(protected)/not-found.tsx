import Link from 'next/link';
import { AdminPanel } from '@/components/admin/admin-panel';
import styles from '@/components/admin/admin.module.css';
import { ADMIN_PATHS } from '@/lib/admin-paths';

export const metadata = { title: 'Không tìm thấy' };

export default function AdminNotFound() {
  return (
    <div className={styles.narrow}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Không tìm thấy trang</h1>
      </div>
      <AdminPanel id="admin-not-found" title="Trang này không còn nữa">
        <div className={styles.stack}>
          <p className={styles.hint}>Trang bạn mở không tồn tại hoặc đã bị xoá</p>
          <div className={styles.btnGroup}>
            <Link href={ADMIN_PATHS.outfits} className={`${styles.btn} ${styles.btnPrimary}`}>
              Về danh sách outfit
            </Link>
          </div>
        </div>
      </AdminPanel>
    </div>
  );
}
