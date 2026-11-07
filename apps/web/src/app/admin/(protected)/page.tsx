import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { OverviewContent } from '@/components/admin/overview/overview-content';
import { AdminSkeleton } from '@/components/admin/shell/admin-skeleton';
import styles from '@/components/admin/admin.module.css';
import { ADMIN_PATHS } from '@/lib/admin-paths';

export const metadata: Metadata = { title: 'Tổng quan' };

// The outfit list used to live at /admin; these params identify old bookmarks and filter forms.
const LEGACY_LIST_PARAMS = ['q', 'status', 'page'];

const toSearch = (raw: Record<string, string | string[] | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const entries = Array.isArray(value) ? value : value === undefined ? [] : [value];
    for (const entry of entries) search.append(key, entry);
  }
  return search.toString();
};

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  if (LEGACY_LIST_PARAMS.some((key) => key in raw)) redirect(`${ADMIN_PATHS.outfits}?${toSearch(raw)}`);

  // Suspense lives here, not in a segment loading.tsx: a loading boundary around this page would
  // stream the redirect above as a 200 + meta refresh instead of a real 307.
  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Tổng quan</h1>
        <Link href={ADMIN_PATHS.outfitNew} className={`${styles.btn} ${styles.btnPrimary}`}>
          Tạo outfit
        </Link>
      </div>
      <Suspense
        fallback={
          <div className={styles.stack}>
            <AdminSkeleton variant="cards" count={4} />
            <AdminSkeleton variant="table" />
          </div>
        }
      >
        <OverviewContent />
      </Suspense>
    </div>
  );
}
