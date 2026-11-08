import type { ReactNode } from 'react';
import type { FooterInput, PublicAnnouncementDto } from '@under30ss/shared';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { NAV_LABELS, SHELL_COPY } from './public-copy';
import { buildPublicNavItems, type PublicNavItem } from './public-nav-items';
import { SiteAnnouncementBar } from './site-announcement-bar';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import styles from './public-shell.module.css';

interface ShellSettings {
  siteName: string;
  description: string;
  navItems: PublicNavItem[];
  footer: FooterInput;
  announcement: PublicAnnouncementDto | null;
}

/** The 404 page renders this too, so a failing settings call must not take the whole page down. */
async function loadShellSettings(): Promise<ShellSettings> {
  try {
    const settings = await getPublicSettings();
    return {
      siteName: settings.siteName,
      description: settings.seoDescription,
      navItems: buildPublicNavItems(settings),
      footer: settings.footer ?? { columns: [], social: [] },
      announcement: settings.announcement ?? null,
    };
  } catch (error) {
    console.error('Failed to load public settings for the shell', error);
    return {
      siteName: NAV_LABELS.home,
      description: '',
      navItems: buildPublicNavItems(),
      footer: { columns: [], social: [] },
      announcement: null,
    };
  }
}

export async function PublicShell({ children }: { children: ReactNode }) {
  const { siteName, description, navItems, footer, announcement } = await loadShellSettings();
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        {SHELL_COPY.skipLink}
      </a>
      {announcement ? <SiteAnnouncementBar announcement={announcement} /> : null}
      <SiteHeader siteName={siteName} navItems={navItems} />
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <SiteFooter siteName={siteName} description={description} navItems={navItems} footer={footer} />
    </div>
  );
}
