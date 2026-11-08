import Link from 'next/link';
import { HideOnScrollHeader } from './hide-on-scroll-header';
import { SHELL_COPY } from './public-copy';
import { HOME_PATH, type PublicNavItem } from './public-nav-items';
import { PublicNavLinks } from './public-nav-links';
import styles from './site-header.module.css';

interface SiteHeaderProps {
  siteName: string;
  navItems: readonly PublicNavItem[];
}

export function SiteHeader({ siteName, navItems }: SiteHeaderProps) {
  return (
    <HideOnScrollHeader className={styles.header}>
      <div className={styles.inner}>
        <Link href={HOME_PATH} className={styles.brand}>
          {siteName}
        </Link>
        <PublicNavLinks
          items={navItems}
          label={SHELL_COPY.mainNav}
          className={styles.nav}
          linkClassName={styles.navLink}
        />
      </div>
    </HideOnScrollHeader>
  );
}
