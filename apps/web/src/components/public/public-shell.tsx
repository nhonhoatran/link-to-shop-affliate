import type { ReactNode } from 'react';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { NAV_LABELS, SHELL_COPY } from './public-copy';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import styles from './public-shell.module.css';

/** The 404 page renders this too, so a failing settings call must not take the whole page down. */
async function loadShellSettings(): Promise<{ siteName: string; description: string }> {
  try {
    const { siteName, seoDescription } = await getPublicSettings();
    return { siteName, description: seoDescription };
  } catch (error) {
    console.error('Failed to load public settings for the shell', error);
    return { siteName: NAV_LABELS.home, description: '' };
  }
}

export async function PublicShell({ children }: { children: ReactNode }) {
  const { siteName, description } = await loadShellSettings();
  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        {SHELL_COPY.skipLink}
      </a>
      <SiteHeader siteName={siteName} />
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <SiteFooter siteName={siteName} description={description} />
    </div>
  );
}
