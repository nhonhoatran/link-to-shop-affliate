import { getAdminStats } from '@/app/admin/_lib/admin-api';
import { getWebEnv } from '@/lib/web-env';
import { OverviewFeaturedCard } from './overview-featured-card';
import { OverviewKpiGrid } from './overview-kpi-grid';
import { OverviewRecentList } from './overview-recent-list';
import styles from './overview.module.css';

export async function OverviewContent() {
  const stats = await getAdminStats();
  return (
    <>
      <OverviewKpiGrid counts={stats.counts} />
      <div className={styles.sections}>
        <OverviewFeaturedCard featured={stats.featured} />
        <OverviewRecentList items={stats.recent} timeZone={getWebEnv().ADMIN_TIME_ZONE} />
      </div>
    </>
  );
}
