import Link from 'next/link';
import type { AdminOutfitListItemDto } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { formatAdminDate } from '@/lib/format-admin-date';
import { AdminPanel } from '../admin-panel';
import adminStyles from '../admin.module.css';
import listStyles from '../admin-list.module.css';
import styles from './overview.module.css';

export function OverviewRecentList({ items, timeZone }: { items: AdminOutfitListItemDto[]; timeZone: string }) {
  return (
    <AdminPanel
      id="overview-recent"
      title="Sửa gần đây"
      actions={
        <Link href={ADMIN_PATHS.outfits} className={styles.viewAll}>
          Xem tất cả
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className={adminStyles.hint}>Chưa có outfit nào</p>
      ) : (
        <ul className={styles.recentList}>
          {items.map((item) => (
            <li key={item.id} className={styles.recentRow}>
              <Link href={ADMIN_PATHS.outfitEdit(item.id)} className={styles.recentTitle}>
                {item.title}
              </Link>
              <span className={`${listStyles.badge} ${item.status === 'published' ? listStyles.badgeOk : ''}`}>
                {item.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
              </span>
              <time dateTime={item.updatedAt} className={styles.recentDate}>
                {formatAdminDate(item.updatedAt, timeZone, true)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </AdminPanel>
  );
}
