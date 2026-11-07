import Link from 'next/link';
import { HideOnScrollHeader } from './hide-on-scroll-header';
import { SHELL_COPY } from './public-copy';
import { HOME_PATH, PUBLIC_NAV_ITEMS } from './public-nav-items';
import { PublicNavLinks } from './public-nav-links';
import styles from './site-header.module.css';

export function SiteHeader({ siteName }: { siteName: string }) {
  return (
    <HideOnScrollHeader className={styles.header}>
      <div className={styles.inner}>
        <Link href={HOME_PATH} className={styles.brand}>
          {siteName}
        </Link>
        <PublicNavLinks
          items={PUBLIC_NAV_ITEMS}
          label={SHELL_COPY.mainNav}
          className={styles.nav}
          linkClassName={styles.navLink}
        />
      </div>
    </HideOnScrollHeader>
  );
}
