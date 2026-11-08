import Link from 'next/link';
import styles from '../admin.module.css';
import listStyles from '../admin-list.module.css';

interface CollectionPaginationProps {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  label?: string;
}

/** Same markup as the outfit list pager, with the URL built by the caller (two lists can share one page). */
export function CollectionPagination({ page, totalPages, hrefForPage, label = 'Phân trang' }: CollectionPaginationProps) {
  if (totalPages <= 1) return null;
  const linkClass = `${styles.btn} ${styles.btnSecondary} ${listStyles.pageButton}`;
  return (
    <nav aria-label={label} className={listStyles.pagination}>
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={linkClass} rel="prev">
          Trước
        </Link>
      ) : null}
      <span aria-current="page">
        Trang {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={linkClass} rel="next">
          Sau
        </Link>
      ) : null}
    </nav>
  );
}
