import Link from 'next/link';
import type { AdminStatsResponse } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import adminStyles from '../admin.module.css';
import styles from './overview.module.css';

const formatCount = (value: number) => value.toLocaleString('vi-VN');

export function OverviewKpiGrid({ counts }: { counts: AdminStatsResponse['counts'] }) {
  return (
    <section aria-label="Số liệu outfit" className={styles.kpiGrid}>
      <Link href={ADMIN_PATHS.outfits} className={`${adminStyles.panel} ${styles.kpi}`}>
        <span className={styles.kpiLabel}>Tổng outfit</span>
        <strong className={styles.kpiValue}>{formatCount(counts.total)}</strong>
      </Link>
      <Link href={`${ADMIN_PATHS.outfits}?status=published`} className={`${adminStyles.panel} ${styles.kpi}`}>
        <span className={styles.kpiLabel}>Đã đăng</span>
        <strong className={styles.kpiValue}>{formatCount(counts.published)}</strong>
      </Link>
      <Link href={`${ADMIN_PATHS.outfits}?status=draft`} className={`${adminStyles.panel} ${styles.kpi}`}>
        <span className={styles.kpiLabel}>Bản nháp</span>
        <strong className={styles.kpiValue}>{formatCount(counts.draft)}</strong>
      </Link>
      <div className={`${adminStyles.panel} ${styles.kpi}`}>
        <span className={styles.kpiLabel}>Thiếu link affiliate</span>
        <strong className={styles.kpiValue}>{formatCount(counts.publishedMissingAffiliate)}</strong>
        <span className={styles.kpiHint}>
          Outfit đã đăng chưa có link. Bản nháp thiếu link: {formatCount(counts.draftMissingAffiliate)}
        </span>
      </div>
    </section>
  );
}
