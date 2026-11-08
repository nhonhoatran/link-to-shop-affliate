import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CollectionDeleteAction } from '@/components/admin/collections/collection-delete-action';
import { CollectionForm } from '@/components/admin/collections/collection-form';
import {
  COLLECTION_OUTFIT_PAGE_PARAM,
  collectionOutfitsPageHref,
  parsePageParam,
} from '@/components/admin/collections/collection-list-query';
import { CollectionOutfitsPanel } from '@/components/admin/collections/collection-outfits-panel';
import styles from '@/components/admin/admin.module.css';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { getAdminCollection, getCollectionOutfits } from '../../../_lib/admin-collection-api';

export const metadata: Metadata = { title: 'Sửa bộ sưu tập' };

export default async function AdminCollectionEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const page = parsePageParam(query[COLLECTION_OUTFIT_PAGE_PARAM]);
  const [collection, outfits] = await Promise.all([getAdminCollection(id), getCollectionOutfits(id, page)]);
  const totalPages = Math.max(1, Math.ceil(outfits.total / outfits.size));
  // Removing the last outfit of the last page leaves that page empty: go back to the new last one.
  if (page > totalPages) redirect(collectionOutfitsPageHref(id, totalPages));

  return (
    <div className={styles.narrow}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>{collection.name}</h1>
        <div className={styles.btnGroup}>
          <Link href={ADMIN_PATHS.collections} className={`${styles.btn} ${styles.btnSecondary}`}>
            Quay lại danh sách
          </Link>
          <CollectionDeleteAction id={collection.id} name={collection.name} usage={collection.usage} />
        </div>
      </div>
      <div className={styles.stack}>
        <CollectionForm key={collection.id} initial={collection} />
        <CollectionOutfitsPanel
          collectionId={collection.id}
          items={outfits.items}
          total={outfits.total}
          page={outfits.page}
          totalPages={totalPages}
        />
      </div>
    </div>
  );
}
