import Image from 'next/image';
import Link from 'next/link';
import type { AdminOutfitListItemDto } from '@under30ss/shared';
import { formatAdminDate } from '@/lib/format-admin-date';
import styles from './admin.module.css';
import listStyles from './admin-list.module.css';

export function OutfitListTable({ items, timeZone }: { items: AdminOutfitListItemDto[]; timeZone: string }) {
  return (
    <table className={listStyles.table}>
      <caption className={styles.srOnly}>Danh sách outfit</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className={styles.srOnly}>Ảnh</span>
          </th>
          <th scope="col">Tên</th>
          <th scope="col">Trạng thái</th>
          <th scope="col">Nổi bật</th>
          <th scope="col">Cập nhật</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td colSpan={5} className={listStyles.emptyRow}>
              Chưa có outfit nào khớp.
            </td>
          </tr>
        ) : (
          items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className={listStyles.thumb}>
                  <Image src={item.modelImageUrl} alt="" fill sizes="48px" />
                </div>
              </td>
              <td>
                <Link href={`/admin/outfits/${item.id}`}>{item.title}</Link>
              </td>
              <td>
                <span className={`${listStyles.badge} ${item.status === 'published' ? listStyles.badgeOk : ''}`}>
                  {item.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
                </span>
              </td>
              <td>{item.featured ? 'Nổi bật' : ''}</td>
              <td>{formatAdminDate(item.updatedAt, timeZone, true)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
