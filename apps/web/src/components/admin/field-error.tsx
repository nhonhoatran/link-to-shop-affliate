import type { ReactNode } from 'react';
import styles from './admin-form.module.css';

export function FieldError({ id, message }: { id: string; message?: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.fieldError}>
      {message}
    </p>
  );
}

/** Form-level message. Errors interrupt (role=alert); warnings are announced politely. */
export function FormError({
  message,
  tone = 'error',
}: {
  message?: string | null | undefined;
  tone?: 'error' | 'warning';
}) {
  if (!message) return null;
  const warning = tone === 'warning';
  return (
    <p role={warning ? 'status' : 'alert'} className={`${styles.formError} ${warning ? styles.formWarning : ''}`}>
      {message}
    </p>
  );
}

/** Small inline label on a list row, e.g. "Chưa đặt điểm". */
export function StatusTag({ tone, children }: { tone: 'error' | 'warning'; children: ReactNode }) {
  return <span className={`${styles.tag} ${tone === 'error' ? styles.tagError : styles.tagWarning}`}>{children}</span>;
}
