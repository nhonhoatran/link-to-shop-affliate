import Link from 'next/link';
import { looksPagePath } from '@/lib/seo/absolute-url';
import { buildPageWindow } from './build-page-window';
import { LOOKS_PAGE_COPY } from './public-copy';
import styles from './looks-pagination.module.css';

interface LooksPaginationProps {
  page: number;
  totalPages: number;
  /** Defaults to the /looks URLs. */
  pathForPage?: (page: number) => string;
}

export function LooksPagination({ page, totalPages, pathForPage = looksPagePath }: LooksPaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={LOOKS_PAGE_COPY.pagination} className={styles.nav}>
      {page > 1 ? (
        <Link href={pathForPage(page - 1)} rel="prev" className={`${styles.link} ${styles.edge}`}>
          {LOOKS_PAGE_COPY.previous}
        </Link>
      ) : null}
      {buildPageWindow(page, totalPages).map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} aria-hidden="true" className={styles.gap}>
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={pathForPage(entry)}
            className={styles.link}
            aria-current={entry === page ? 'page' : undefined}
            aria-label={LOOKS_PAGE_COPY.pageLabel(entry)}
          >
            {entry}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={pathForPage(page + 1)} rel="next" className={`${styles.link} ${styles.edge}`}>
          {LOOKS_PAGE_COPY.next}
        </Link>
      ) : null}
    </nav>
  );
}
