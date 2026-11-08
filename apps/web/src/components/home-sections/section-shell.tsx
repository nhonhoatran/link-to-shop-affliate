import type { ReactNode } from 'react';
import { PublicSmartLink } from '@/components/public/public-smart-link';
import { HOME_SECTION_COPY } from './home-section-copy';
import styles from './section-shell.module.css';

export type SectionMode = 'public' | 'preview';

/** `preview`: no autoplay and no structured data, because the editor frame is not the real page. */
export interface SectionViewProps<S> {
  section: S;
  headingId: string;
  /** True for the first section with an image: its image is the LCP candidate. */
  priority: boolean;
  siteUrl: string;
  mode: SectionMode;
  /** Used by structured data when the content has no description of its own. */
  fallbackDescription?: string;
}

interface SectionShellProps {
  sectionId: string;
  headingId: string;
  /** Visible h2. Without it `label` names the region. */
  title?: string;
  label?: string;
  roleDescription?: string;
  children: ReactNode;
}

export function SectionShell({ sectionId, headingId, title, label, roleDescription, children }: SectionShellProps) {
  return (
    <section
      className={styles.shell}
      data-section-id={sectionId}
      aria-roledescription={roleDescription}
      {...(title ? { 'aria-labelledby': headingId } : { 'aria-label': label })}
    >
      {title ? (
        <h2 id={headingId} className={styles.title}>
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function SectionViewAll({ href }: { href: string }) {
  return (
    <div className={styles.actions}>
      <PublicSmartLink href={href} className={styles.pill}>
        {HOME_SECTION_COPY.viewAll}
      </PublicSmartLink>
    </div>
  );
}

export const srOnlyClass = styles.srOnly;
