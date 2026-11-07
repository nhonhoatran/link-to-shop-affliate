import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LooksPagination } from '@/components/public/looks-pagination';
import { OutfitCardGrid } from '@/components/public/outfit-card-grid';
import { parseLooksPageParam } from '@/components/public/parse-looks-page-param';
import { EMPTY_LOOKS_COPY, LOOKS_PAGE_COPY } from '@/components/public/public-copy';
import { PublicMessage } from '@/components/public/public-message';
import { PublicPage } from '@/components/public/public-page';
import { buildLooksMetadata } from '@/lib/seo/build-looks-metadata';
import { getPublicOutfitPage, getPublicSettings } from '@/lib/seo/public-data-loaders';
import { getWebEnv } from '@/lib/web-env';
import styles from './looks-page.module.css';

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
  const { items, total, size } = await getPublicOutfitPage(page, settings.looksPageSize);

  if (total === 0) {
    return (
      <PublicPage>
        <PublicMessage title={EMPTY_LOOKS_COPY.title} message={EMPTY_LOOKS_COPY.message} />
      </PublicPage>
    );
  }
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (page > totalPages) notFound();

  return (
    <PublicPage>
      <h1 className={styles.title}>{LOOKS_PAGE_COPY.title}</h1>
      <OutfitCardGrid items={items} headingLevel="h2" highPriorityFirstRow />
      <LooksPagination page={page} totalPages={totalPages} />
    </PublicPage>
  );
}
