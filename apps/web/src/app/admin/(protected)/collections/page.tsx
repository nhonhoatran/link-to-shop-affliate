import type { Metadata } from 'next';
import Link from 'next/link';
import { CollectionListFilters } from '@/components/admin/collections/collection-list-filters';
import { buildCollectionListHref, parseCollectionListQuery } from '@/components/admin/collections/collection-list-query';
import { CollectionListTable } from '@/components/admin/collections/collection-list-table';
import { CollectionPagination } from '@/components/admin/collections/collection-pagination';
import styles from '@/components/admin/admin.module.css';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { getAdminCollectionList } from '../../_lib/admin-collection-api';

export const metadata: Metadata = { title: 'Bộ sưu tập' };

export default async function AdminCollectionListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseCollectionListQuery(await searchParams);
  const list = await getAdminCollectionList(query);
  const totalPages = Math.max(1, Math.ceil(list.total / list.size));
  const filtered = query.q !== '' || query.status !== undefined;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>Bộ sưu tập</h1>
        <Link href={ADMIN_PATHS.collectionNew} className={`${styles.btn} ${styles.btnPrimary}`}>
          Tạo bộ sưu tập
        </Link>
      </div>
      <div className={styles.panel}>
        <CollectionListFilters query={query} />
        {filtered ? <p className={styles.hint}>Bỏ bộ lọc để đổi thứ tự bộ sưu tập.</p> : null}
        <CollectionListTable items={list.items} page={list.page} totalPages={totalPages} canReorder={!filtered} />
        <CollectionPagination
          page={list.page}
          totalPages={totalPages}
          hrefForPage={(target) => buildCollectionListHref(query, target)}
        />
      </div>
    </div>
  );
}
