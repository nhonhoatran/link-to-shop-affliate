import Link from 'next/link';
import { LOOKS_PAGE_PATH } from '@under30ss/shared';
import { LOOKS_PAGE_COPY, NAV_LABELS } from './public-copy';
import { HOME_PATH } from './public-nav-items';
import styles from './look-breadcrumb.module.css';

export function LookBreadcrumb({ title }: { title: string }) {
  return (
    <nav aria-label={LOOKS_PAGE_COPY.breadcrumb} className={styles.nav}>
      <ol className={styles.list}>
        <li className={styles.item}>
          <Link href={HOME_PATH} className={styles.link}>
            {NAV_LABELS.home}
          </Link>
        </li>
        <li className={styles.item}>
          <Link href={LOOKS_PAGE_PATH} className={styles.link}>
            {NAV_LABELS.looks}
          </Link>
        </li>
        <li className={styles.item} aria-current="page">
          {title}
        </li>
      </ol>
    </nav>
  );
}
