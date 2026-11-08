import type { FooterInput } from '@under30ss/shared';
import { footerCopyright, SHELL_COPY } from './public-copy';
import type { PublicNavItem } from './public-nav-items';
import { PublicNavLinks } from './public-nav-links';
import { SiteFooterColumns } from './site-footer-columns';
import { SiteSocialLinks } from './site-social-links';
import styles from './site-footer.module.css';

interface SiteFooterProps {
  siteName: string;
  description: string;
  navItems: readonly PublicNavItem[];
  footer?: FooterInput | undefined;
}

export function SiteFooter({ siteName, description, navItems, footer }: SiteFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {description ? <p className={styles.description}>{description}</p> : null}
        <PublicNavLinks
          items={navItems}
          label={SHELL_COPY.footerNav}
          className={styles.nav}
          linkClassName={styles.navLink}
        />
        {footer ? (
          <div className={styles.extra}>
            <SiteFooterColumns columns={footer.columns} />
            <SiteSocialLinks social={footer.social} />
          </div>
        ) : null}
      </div>
      <p aria-hidden="true" className={styles.wordmark}>
        {siteName}
      </p>
      <p className={styles.copyright}>{footerCopyright(new Date().getFullYear(), siteName)}</p>
    </footer>
  );
}
