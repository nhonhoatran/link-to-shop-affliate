import Link from 'next/link';
import styles from './admin.module.css';
import listStyles from './admin-list.module.css';
import { buildListHref, type OutfitListQuery } from './outfit-list-query';

interface PaginationLinksProps {
  query: OutfitListQuery;
  page: number;
  totalPages: number;
}

export function PaginationLinks({ query, page, totalPages }: PaginationLinksProps) {
  if (totalPages <= 1) return null;
  const linkClass = `${styles.btn} ${styles.btnSecondary} ${listStyles.pageButton}`;
  return (
    <nav aria-label="Phân trang" className={listStyles.pagination}>
      {page > 1 ? (
        <Link href={buildListHref(query, page - 1)} className={linkClass} rel="prev">
          Trước
        </Link>
      ) : null}
      <span aria-current="page">
        Trang {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={buildListHref(query, page + 1)} className={linkClass} rel="next">
          Sau
        </Link>
      ) : null}
    </nav>
  );
}
