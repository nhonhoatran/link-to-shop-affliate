import type { ReactNode } from 'react';
import type { SaveStatus } from '@/hooks/admin/use-outfit-actions';
import styles from './admin.module.css';

/**
 * Pending-label rule for the whole admin:
 * - Forms with a save-status line (outfit editor, settings) report progress only here; their Save button keeps its label.
 * - Every other submit/delete button swaps its own label while pending ("Đang tạo…", "Đang xoá…").
 * The line starts empty: nothing is claimed until something happened in this session.
 */
const statusText = (status: SaveStatus, dirty: boolean): string => {
  if (status === 'saving') return 'Đang lưu…';
  if (status === 'error') return 'Chưa lưu được';
  if (dirty) return 'Có thay đổi chưa lưu';
  return status === 'saved' ? 'Đã lưu' : '';
};

/** Polite live region for short outcome text; stays mounted so changes are announced. */
export function StatusMessage({ children }: { children?: ReactNode }) {
  return (
    <p role="status" className={styles.hint}>
      {children}
    </p>
  );
}

/** The one save-state line shared by the outfit editor and the settings form. */
export function SaveStatusText({ status, dirty }: { status: SaveStatus; dirty: boolean }) {
  return <StatusMessage>{statusText(status, dirty)}</StatusMessage>;
}
