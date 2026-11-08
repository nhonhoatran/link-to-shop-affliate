import type { Metadata } from 'next';
import styles from '@/components/admin/admin.module.css';
import { CollectionPagination } from '@/components/admin/collections/collection-pagination';
import { NEWSLETTER_EXPORT_LABEL, NEWSLETTER_PAGE_TITLE } from '@/components/admin/newsletter/newsletter-copy';
import { NewsletterListFilters } from '@/components/admin/newsletter/newsletter-list-filters';
import {
  buildNewsletterExportHref,
  buildNewsletterListHref,
  parseNewsletterListQuery,
} from '@/components/admin/newsletter/newsletter-list-query';
import { NewsletterListTable } from '@/components/admin/newsletter/newsletter-list-table';
import { getWebEnv } from '@/lib/web-env';
import { getAdminNewsletterList } from '../../_lib/admin-newsletter-api';

export const metadata: Metadata = { title: NEWSLETTER_PAGE_TITLE };

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseNewsletterListQuery(await searchParams);
  const list = await getAdminNewsletterList(query);
  const totalPages = Math.max(1, Math.ceil(list.total / list.size));
  const filtered = query.q !== '' || query.status !== undefined;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h1 className={styles.title}>{NEWSLETTER_PAGE_TITLE}</h1>
        <a href={buildNewsletterExportHref(query)} download className={`${styles.btn} ${styles.btnSecondary}`}>
          {NEWSLETTER_EXPORT_LABEL}
        </a>
      </div>
      <div className={styles.panel}>
        <NewsletterListFilters query={query} />
        <NewsletterListTable items={list.items} filtered={filtered} timeZone={getWebEnv().ADMIN_TIME_ZONE} />
        <CollectionPagination
          page={list.page}
          totalPages={totalPages}
          hrefForPage={(target) => buildNewsletterListHref(query, target)}
        />
      </div>
    </div>
  );
}
