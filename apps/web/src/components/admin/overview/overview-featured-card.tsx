import Image from 'next/image';
import Link from 'next/link';
import type { AdminOutfitListItemDto } from '@under30ss/shared';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { AdminPanel } from '../admin-panel';
import adminStyles from '../admin.module.css';
import styles from './overview.module.css';

export function OverviewFeaturedCard({ featured }: { featured: AdminOutfitListItemDto | null }) {
  return (
    <AdminPanel id="overview-featured" title="Outfit nổi bật">
      {featured ? (
        <div className={styles.featured}>
          <div className={styles.featuredImage}>
            <Image src={featured.modelImageUrl} alt="" fill sizes="96px" />
          </div>
          <div className={styles.featuredBody}>
            <p className={styles.featuredTitle}>{featured.title}</p>
            <Link href={ADMIN_PATHS.outfitEdit(featured.id)} className={`${adminStyles.btn} ${adminStyles.btnSecondary}`}>
              Sửa
              <span className={adminStyles.srOnly}> {featured.title}</span>
            </Link>
          </div>
        </div>
      ) : (
        <p className={adminStyles.hint}>
          Chưa có outfit nổi bật. Mở một outfit đã đăng và đánh dấu Nổi bật để hiện ở trang chủ
        </p>
      )}
    </AdminPanel>
  );
}
