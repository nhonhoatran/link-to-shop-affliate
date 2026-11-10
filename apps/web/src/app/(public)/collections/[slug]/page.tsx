import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { collectionSlugSchema, DEFAULT_COLLECTIONS_LABEL } from '@under30ss/shared';
import { OutfitFeed } from '@/components/feed/outfit-feed';
import { COLLECTIONS_COPY } from '@/components/public/collection-copy';
import { parseLooksPageParam } from '@/components/public/parse-looks-page-param';
import { PublicPage } from '@/components/public/public-page';
import { collectionPath } from '@/lib/seo/absolute-url';
import { buildCollectionMetadata } from '@/lib/seo/build-collection-metadata';
import { getCollectionPage } from '@/lib/seo/public-collection-loaders';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { getOutfitFeedPage, nextFeedPage } from '@/lib/seo/public-feed-loaders';
import { getWebEnv } from '@/lib/web-env';
import hidden from '@/styles/visually-hidden.module.css';
import styles from './collection-page.module.css';

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

// Only the collection itself is used (outfits come from the feed); a malformed slug would get a 400 from the API.
const loadCollection = async (slug: string) => {
  if (!collectionSlugSchema.safeParse(slug).success) notFound();
  const data = await getCollectionPage(slug, 1, 1);
  if (!data) notFound();
  return data.collection;
};

export async function generateMetadata({ params, searchParams }: CollectionPageProps): Promise<Metadata> {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const pageNumber = parseLooksPageParam(page);
  const [settings, collection] = await Promise.all([getPublicSettings(), loadCollection(slug)]);
  return buildCollectionMetadata({
    collection,
    settings,
    siteUrl: getWebEnv().SITE_URL,
    page: pageNumber,
    label: settings.collectionsLabel ?? DEFAULT_COLLECTIONS_LABEL,
  });
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const pageNumber = parseLooksPageParam(page);
  const [settings, collection] = await Promise.all([getPublicSettings(), loadCollection(slug)]);
  const feed = await getOutfitFeedPage(pageNumber, settings.looksPageSize, slug);
  if (!feed) notFound();

  if (feed.total === 0) {
    return (
      <PublicPage>
        <h1 className={hidden.hidden}>{collection.name}</h1>
        <p className={styles.empty}>{COLLECTIONS_COPY.emptyCollection}</p>
      </PublicPage>
    );
  }
  if (pageNumber > Math.max(1, Math.ceil(feed.total / feed.size))) notFound();

  return (
    <>
      <h1 className={hidden.hidden}>{collection.name}</h1>
      <OutfitFeed
        outfits={feed.items}
        nextPage={nextFeedPage(feed)}
        size={feed.size}
        basePath={collectionPath(collection.slug)}
        collection={collection.slug}
      />
    </>
  );
}
