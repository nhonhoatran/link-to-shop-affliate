import Link from 'next/link';
import { LOOKS_PAGE_COPY } from './public-copy';
import styles from './look-breadcrumb.module.css';

export interface BreadcrumbEntry {
  label: string;
  /** Omitted on the last entry, which is the current page. */
  href?: string;
}

export function PublicBreadcrumb({ trail }: { trail: readonly BreadcrumbEntry[] }) {
  return (
    <nav aria-label={LOOKS_PAGE_COPY.breadcrumb} className={styles.nav}>
      <ol className={styles.list}>
        {trail.map((entry, index) =>
          index < trail.length - 1 && entry.href ? (
            <li key={entry.href} className={styles.item}>
              <Link href={entry.href} className={styles.link}>
                {entry.label}
              </Link>
            </li>
          ) : (
            <li key="current" className={styles.item} aria-current="page">
              {entry.label}
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}
