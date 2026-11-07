import Image from 'next/image';
import Link from 'next/link';
import type { AdminOutfitListItemDto } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { formatAdminDate } from '@/lib/format-admin-date';
import styles from './admin.module.css';
import listStyles from './admin-list.module.css';

export function OutfitListTable({ items, timeZone }: { items: AdminOutfitListItemDto[]; timeZone: string }) {
  return (
    <table className={listStyles.table} role="table">
      <caption className={styles.srOnly}>Danh sách outfit</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            <span className={styles.srOnly}>Ảnh</span>
          </th>
          <th scope="col" role="columnheader">Tên</th>
          <th scope="col" role="columnheader">Trạng thái</th>
          <th scope="col" role="columnheader">Nổi bật</th>
          <th scope="col" role="columnheader">Cập nhật</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {items.length === 0 ? (
          <tr role="row">
            <td colSpan={5} role="cell" className={listStyles.emptyRow}>
              Chưa có outfit nào khớp.
            </td>
          </tr>
        ) : (
          items.map((item) => (
            <tr key={item.id} role="row" className={listStyles.rowWithThumb}>
              <td role="cell" className={listStyles.cellThumb} data-label="">
                <div className={listStyles.thumb}>
                  <Image src={item.modelImageUrl} alt="" fill sizes="48px" />
                </div>
              </td>
              <td role="cell" data-label="">
                <Link href={ADMIN_PATHS.outfitEdit(item.id)} className={listStyles.titleLink}>
                  {item.title}
                </Link>
              </td>
              <td role="cell" data-label="Trạng thái">
                <span className={`${listStyles.badge} ${item.status === 'published' ? listStyles.badgeOk : ''}`}>
                  {item.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
                </span>
              </td>
              <td role="cell" data-label="">{item.featured ? 'Nổi bật' : ''}</td>
              <td role="cell" data-label="Cập nhật">{formatAdminDate(item.updatedAt, timeZone, true)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
