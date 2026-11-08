import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DEFAULT_COLLECTIONS_LABEL } from '@under30ss/shared';
import { CollectionCardGrid } from '@/components/public/collection-card-grid';
import { COLLECTIONS_COPY } from '@/components/public/collection-copy';
import { LooksPagination } from '@/components/public/looks-pagination';
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
  searchParams: Promise<{ page?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: CollectionsPageProps): Promise<Metadata> {
  const [{ page }, settings] = await Promise.all([searchParams, getPublicSettings()]);
  return buildCollectionsMetadata({
    settings,
    siteUrl: getWebEnv().SITE_URL,
    page: parseLooksPageParam(page),
    label: settings.collectionsLabel ?? DEFAULT_COLLECTIONS_LABEL,
  });
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const page = parseLooksPageParam((await searchParams).page);
  const settings = await getPublicSettings();
  const { items, total, size } = await getPublicCollectionPage(page, settings.looksPageSize);

  if (total === 0) {
    return (
      <PublicPage>
        <PublicMessage title={COLLECTIONS_COPY.empty.title} message={COLLECTIONS_COPY.empty.message} />
      </PublicPage>
    );
  }
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (page > totalPages) notFound();

  return (
    <PublicPage>
      <h1 className={styles.title}>{settings.collectionsLabel ?? DEFAULT_COLLECTIONS_LABEL}</h1>
      <CollectionCardGrid items={items} headingLevel="h2" highPriorityFirstRow />
      <LooksPagination page={page} totalPages={totalPages} pathForPage={collectionsPagePath} />
    </PublicPage>
  );
}
