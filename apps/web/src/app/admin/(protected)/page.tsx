import type { Metadata } from 'next';
import Link from 'next/link';
import { API_PATHS, type AdminOutfitListResponse } from '@under30ss/shared';
import { OutfitListFilters } from '@/components/admin/outfit-list-filters';
import { OutfitListTable } from '@/components/admin/outfit-list-table';
import { parseOutfitListQuery } from '@/components/admin/outfit-list-query';
import { PaginationLinks } from '@/components/admin/pagination-links';
import styles from '@/components/admin/admin.module.css';
import { getWebEnv } from '@/lib/web-env';
import { adminGet } from '../_lib/admin-api';

export const metadata: Metadata = { title: 'Outfit' };

export default async function AdminOutfitListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseOutfitListQuery(await searchParams);
  const params = new URLSearchParams({ page: String(query.page) });
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  const list = await adminGet<AdminOutfitListResponse>(`${API_PATHS.admin.outfits}?${params.toString()}`);
  const totalPages = Math.max(1, Math.ceil(list.total / list.size));

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Outfit</h1>
        <Link href="/admin/outfits/new" className={`${styles.btn} ${styles.btnPrimary}`}>
          Tạo outfit
        </Link>
      </div>
      <div className={styles.panel}>
        <OutfitListFilters query={query} />
        <OutfitListTable items={list.items} timeZone={getWebEnv().ADMIN_TIME_ZONE} />
        <PaginationLinks query={query} page={list.page} totalPages={totalPages} />
      </div>
    </div>
  );
}
