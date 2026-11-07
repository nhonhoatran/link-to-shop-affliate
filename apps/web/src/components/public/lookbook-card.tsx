import type { ReactNode } from 'react';
import styles from './lookbook-card.module.css';

export function LookbookCard({ children }: { children: ReactNode }) {
  return <div className={styles.card}>{children}</div>;
}
