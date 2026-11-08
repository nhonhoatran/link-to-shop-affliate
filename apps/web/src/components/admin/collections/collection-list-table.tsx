import Image from 'next/image';
import Link from 'next/link';
import type { AdminCollectionListItemDto } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import styles from '../admin.module.css';
import listStyles from '../admin-list.module.css';
import { CollectionOrderButtons } from './collection-order-buttons';

interface CollectionListTableProps {
  items: AdminCollectionListItemDto[];
  /** Position of this page in the whole list, to know which rows are first and last overall. */
  page: number;
  totalPages: number;
  /** False while a search or status filter is active: a move then affects rows the person cannot see. */
  canReorder: boolean;
}

export function CollectionListTable({ items, page, totalPages, canReorder }: CollectionListTableProps) {
  return (
    <table className={listStyles.table} role="table">
      <caption className={styles.srOnly}>Danh sách bộ sưu tập</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            <span className={styles.srOnly}>Ảnh bìa</span>
          </th>
          <th scope="col" role="columnheader">Tên</th>
          <th scope="col" role="columnheader">Trạng thái</th>
          <th scope="col" role="columnheader">Số outfit</th>
          <th scope="col" role="columnheader">Thứ tự</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {items.length === 0 ? (
          <tr role="row">
            <td colSpan={5} role="cell" className={listStyles.emptyRow}>
              Chưa có bộ sưu tập nào khớp.
            </td>
          </tr>
        ) : (
          items.map((item, index) => (
            <tr key={item.id} role="row" className={listStyles.rowWithThumb}>
              <td role="cell" className={listStyles.cellThumb} data-label="">
                <div className={listStyles.thumb}>
                  {item.coverImageUrl ? <Image src={item.coverImageUrl} alt="" fill sizes="48px" /> : null}
                </div>
              </td>
              <td role="cell" data-label="">
                <Link href={ADMIN_PATHS.collectionEdit(item.id)} className={listStyles.titleLink}>
                  {item.name}
                </Link>
              </td>
              <td role="cell" data-label="Trạng thái">
                <span className={`${listStyles.badge} ${item.status === 'published' ? listStyles.badgeOk : ''}`}>
                  {item.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
                </span>
              </td>
              <td role="cell" data-label="Số outfit">{item.outfitCount}</td>
              <td role="cell" data-label="">
                {canReorder ? (
                  <CollectionOrderButtons
                    id={item.id}
                    name={item.name}
                    canMoveUp={page > 1 || index > 0}
                    canMoveDown={page < totalPages || index < items.length - 1}
                  />
                ) : null}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
