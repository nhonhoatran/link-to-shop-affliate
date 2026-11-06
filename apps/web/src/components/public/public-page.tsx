import type { ReactNode } from 'react';
import styles from './public-page.module.css';

export function PublicPage({ children }: { children: ReactNode }) {
  return <main className={styles.page}>{children}</main>;
}
