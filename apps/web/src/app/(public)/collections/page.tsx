import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COLLECTIONS_PAGE_PATH, DEFAULT_COLLECTIONS_LABEL } from '@under30ss/shared';
import { CollectionCardGrid } from '@/components/public/collection-card-grid';
import { COLLECTIONS_COPY } from '@/components/public/collection-copy';
import { CollectionSearch } from '@/components/public/collection-search';
import { LooksPagination } from '@/components/public/looks-pagination';
import { parseCollectionSearchParam } from '@/components/public/parse-collection-search-param';
import { parseLooksPageParam } from '@/components/public/parse-looks-page-param';
import { PublicMessage } from '@/components/public/public-message';
import { PublicPage } from '@/components/public/public-page';
import { collectionsPagePath } from '@/lib/seo/absolute-url';
import { buildCollectionsMetadata } from '@/lib/seo/build-collection-metadata';
import { getPublicCollectionPage } from '@/lib/seo/public-collection-loaders';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { getWebEnv } from '@/lib/web-env';
import styles from './collections-page.module.css';

interface CollectionsPageProps {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: CollectionsPageProps): Promise<Metadata> {
  const [{ page, q }, settings] = await Promise.all([searchParams, getPublicSettings()]);
  return buildCollectionsMetadata({
    settings,
    siteUrl: getWebEnv().SITE_URL,
    page: parseLooksPageParam(page),
    label: settings.collectionsLabel ?? DEFAULT_COLLECTIONS_LABEL,
    query: parseCollectionSearchParam(q),
  });
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const [params, settings] = await Promise.all([searchParams, getPublicSettings()]);
  const page = parseLooksPageParam(params.page);
  const query = parseCollectionSearchParam(params.q);
  const { items, total, size } = await getPublicCollectionPage(page, settings.looksPageSize, query);
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (total > 0 && page > totalPages) notFound();

  return (
    <PublicPage>
      <h1 className={styles.title}>{settings.collectionsLabel ?? DEFAULT_COLLECTIONS_LABEL}</h1>
      <div className={styles.search}>
        <CollectionSearch key={query} id="collections-search" query={query} label={COLLECTIONS_COPY.search.resultsLabel} />
        {query ? <Link className={styles.clear} href={COLLECTIONS_PAGE_PATH}>{COLLECTIONS_COPY.search.clear}</Link> : null}
      </div>
      {query ? <p className={styles.summary}>{COLLECTIONS_COPY.search.resultCount(total, query)}</p> : null}
      {total === 0 ? (
        <PublicMessage
          title={query ? COLLECTIONS_COPY.search.noResults : COLLECTIONS_COPY.empty.title}
          message={query ? COLLECTIONS_COPY.search.tryAgain : COLLECTIONS_COPY.empty.message}
          headingLevel="h2"
        />
      ) : (
        <>
          <CollectionCardGrid items={items} headingLevel="h2" highPriorityFirstRow />
          <LooksPagination page={page} totalPages={totalPages} pathForPage={(nextPage) => collectionsPagePath(nextPage, query)} />
        </>
      )}
    </PublicPage>
  );
}
