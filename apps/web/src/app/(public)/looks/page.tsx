import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LOOKS_PAGE_PATH } from '@under30ss/shared';
import { OutfitFeed } from '@/components/feed/outfit-feed';
import { parseLooksPageParam } from '@/components/public/parse-looks-page-param';
import { EMPTY_LOOKS_COPY, LOOKS_PAGE_COPY } from '@/components/public/public-copy';
import { PublicMessage } from '@/components/public/public-message';
import { PublicPage } from '@/components/public/public-page';
import { buildLooksMetadata } from '@/lib/seo/build-looks-metadata';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { getOutfitFeedPage, nextFeedPage } from '@/lib/seo/public-feed-loaders';
import { getWebEnv } from '@/lib/web-env';
import hidden from '@/styles/visually-hidden.module.css';

interface LooksPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: LooksPageProps): Promise<Metadata> {
  const [{ page }, settings] = await Promise.all([searchParams, getPublicSettings()]);
  return buildLooksMetadata({ settings, siteUrl: getWebEnv().SITE_URL, page: parseLooksPageParam(page) });
}

export default async function LooksPage({ searchParams }: LooksPageProps) {
  const page = parseLooksPageParam((await searchParams).page);
  const settings = await getPublicSettings();
  const feed = await getOutfitFeedPage(page, settings.looksPageSize);

  if (!feed || feed.total === 0) {
    return (
      <PublicPage>
        <PublicMessage title={EMPTY_LOOKS_COPY.title} message={EMPTY_LOOKS_COPY.message} />
      </PublicPage>
    );
  }
  if (page > Math.max(1, Math.ceil(feed.total / feed.size))) notFound();

  return (
    <>
      <h1 className={hidden.hidden}>{LOOKS_PAGE_COPY.title}</h1>
      <OutfitFeed outfits={feed.items} nextPage={nextFeedPage(feed)} size={feed.size} basePath={LOOKS_PAGE_PATH} />
    </>
  );
}
