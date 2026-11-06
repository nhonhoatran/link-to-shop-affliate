import type { ReactNode } from 'react';
import styles from './admin.module.css';

interface AdminPanelProps {
  /** Used to build the heading id the section is labelled by. */
  id: string;
  title: string;
  headingLevel?: 'h2' | 'h3';
  /** Rendered on the heading row (e.g. toggle buttons). */
  actions?: ReactNode;
  children: ReactNode;
}

/** A panel whose accessible name is its visible heading. */
export function AdminPanel({ id, title, headingLevel: Heading = 'h2', actions, children }: AdminPanelProps) {
  const headingId = `${id}-title`;
  return (
    <section aria-labelledby={headingId} className={styles.panel}>
      <div className={styles.panelHeader}>
        <Heading id={headingId} className={styles.panelTitle}>
          {title}
        </Heading>
        {actions}
      </div>
      {children}
    </section>
  );
}
