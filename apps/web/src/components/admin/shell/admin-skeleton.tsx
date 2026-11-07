import styles from './admin-skeleton.module.css';

type SkeletonVariant = 'lines' | 'cards' | 'table';

interface AdminSkeletonProps {
  variant?: SkeletonVariant;
  /** Number of lines, cards or table rows. */
  count?: number;
}

const DEFAULT_COUNT = 3;

/** Loading placeholder; announces itself once as a busy status region. */
export function AdminSkeleton({ variant = 'lines', count = DEFAULT_COUNT }: AdminSkeletonProps) {
  const items = Array.from({ length: Math.max(1, count) }, (_, index) => index);
  return (
    <div role="status" aria-busy="true" aria-label="Đang tải" className={styles[variant]}>
      {items.map((index) => (
        <div key={index} className={styles.block} aria-hidden="true" />
      ))}
    </div>
  );
}
