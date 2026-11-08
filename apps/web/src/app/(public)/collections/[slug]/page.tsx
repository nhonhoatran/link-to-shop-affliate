import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { COLLECTIONS_PAGE_PATH, DEFAULT_COLLECTIONS_LABEL } from '@under30ss/shared';
import { COLLECTIONS_COPY } from '@/components/public/collection-copy';
import { CollectionHeader } from '@/components/public/collection-header';
import { LooksPagination } from '@/components/public/looks-pagination';
import { OutfitCardGrid } from '@/components/public/outfit-card-grid';
import { parseLooksPageParam } from '@/components/public/parse-looks-page-param';
import { PublicBreadcrumb } from '@/components/public/public-breadcrumb';
import { NAV_LABELS } from '@/components/public/public-copy';
import { HOME_PATH } from '@/components/public/public-nav-items';
import { PublicPage } from '@/components/public/public-page';
import { collectionPagePath } from '@/lib/seo/absolute-url';
import { buildCollectionMetadata } from '@/lib/seo/build-collection-metadata';
import { getCollectionPage } from '@/lib/seo/public-collection-loaders';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { getWebEnv } from '@/lib/web-env';
import styles from './collection-page.module.css';

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

export async function generateMetadata({ params, searchParams }: CollectionPageProps): Promise<Metadata> {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const pageNumber = parseLooksPageParam(page);
  const settings = await getPublicSettings();
  const data = await getCollectionPage(slug, pageNumber, settings.looksPageSize);
  if (!data) notFound();
  return buildCollectionMetadata({
    collection: data.collection,
    settings,
    siteUrl: getWebEnv().SITE_URL,
    page: pageNumber,
    label: settings.collectionsLabel ?? DEFAULT_COLLECTIONS_LABEL,
  });
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const pageNumber = parseLooksPageParam(page);
  const settings = await getPublicSettings();
  const data = await getCollectionPage(slug, pageNumber, settings.looksPageSize);
  if (!data) notFound();

  const { collection, outfits } = data;
  const totalPages = Math.max(1, Math.ceil(outfits.total / outfits.size));
  if (pageNumber > totalPages) notFound();

  return (
    <PublicPage>
      <PublicBreadcrumb
        trail={[
          { label: NAV_LABELS.home, href: HOME_PATH },
          { label: settings.collectionsLabel ?? DEFAULT_COLLECTIONS_LABEL, href: COLLECTIONS_PAGE_PATH },
          { label: collection.name },
        ]}
      />
      <CollectionHeader collection={collection} />
      {outfits.total === 0 ? (
        <p className={styles.empty}>{COLLECTIONS_COPY.emptyCollection}</p>
      ) : (
        <>
          <OutfitCardGrid items={outfits.items} headingLevel="h2" />
          <LooksPagination
            page={pageNumber}
            totalPages={totalPages}
            pathForPage={(target) => collectionPagePath(collection.slug, target)}
          />
        </>
      )}
    </PublicPage>
  );
}
