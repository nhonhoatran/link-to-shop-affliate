import { footerCopyright, SHELL_COPY } from './public-copy';
import { PUBLIC_NAV_ITEMS } from './public-nav-items';
import { PublicNavLinks } from './public-nav-links';
import styles from './site-footer.module.css';

interface SiteFooterProps {
  siteName: string;
  description: string;
}

export function SiteFooter({ siteName, description }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.about}>
          <p className={styles.name}>{siteName}</p>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
        <PublicNavLinks
          items={PUBLIC_NAV_ITEMS}
          label={SHELL_COPY.footerNav}
          className={styles.nav}
          linkClassName={styles.navLink}
        />
      </div>
      <p className={styles.copyright}>{footerCopyright(new Date().getFullYear(), siteName)}</p>
    </footer>
  );
}
