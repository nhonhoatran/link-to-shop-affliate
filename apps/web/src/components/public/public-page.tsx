import type { ReactNode } from 'react';
import styles from './public-page.module.css';

export function PublicPage({ children }: { children: ReactNode }) {
  return <div className={styles.page}>{children}</div>;
}
