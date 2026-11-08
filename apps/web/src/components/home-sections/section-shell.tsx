import type { ReactNode } from 'react';
import type { NewsletterResult } from '@under30ss/shared';
import { PublicSmartLink } from '@/components/public/public-smart-link';
import buttons from '@/components/public/public-button.module.css';
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
  /** Form action and result of the newsletter post/redirect/get; ignored by every other view. */
  newsletter?: NewsletterFormState;
}

export interface NewsletterFormState {
  action?: (formData: FormData) => void | Promise<void>;
  result?: NewsletterResult;
}

interface SectionShellProps {
  sectionId: string;
  headingId: string;
  /** Small uppercase line above the title; only shown together with `title`. */
  eyebrow?: string;
  /** Visible h2. Without it `label` names the region. */
  title?: string;
  label?: string;
  /** Id of a heading the section renders itself; used instead of `label` so the name matches the visible text. */
  labelledBy?: string;
  roleDescription?: string;
  /** Right side of the title row, e.g. a "view all" link. */
  action?: ReactNode;
  children: ReactNode;
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>;
}

export function SectionShell({
  sectionId,
  headingId,
  eyebrow,
  title,
  label,
  labelledBy,
  roleDescription,
  action,
  children,
}: SectionShellProps) {
  const name = title ? { 'aria-labelledby': headingId } : labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': label };
  return (
    <section
      className={styles.shell}
      data-section-id={sectionId}
      aria-roledescription={roleDescription}
      {...name}
    >
      {title ? (
        <div className={styles.header}>
          <div className={styles.heading}>
            {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
            <h2 id={headingId} className={styles.title}>
              {title}
            </h2>
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SectionViewAll({ href }: { href: string }) {
  return (
    <PublicSmartLink href={href} className={`${buttons.button} ${buttons.textLink} ${styles.viewAll}`}>
      {HOME_SECTION_COPY.viewAll}
    </PublicSmartLink>
  );
}

export const srOnlyClass = styles.srOnly;
