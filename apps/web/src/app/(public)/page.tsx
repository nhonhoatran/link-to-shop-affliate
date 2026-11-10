import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  DEFAULT_HOME_MODE,
  NEWSLETTER_RESULTS,
  NEWSLETTER_RESULT_PARAM,
  type NewsletterResult,
} from '@under30ss/shared';
import { OutfitFeed } from '@/components/feed/outfit-feed';
import { HomeSectionList } from '@/components/home-sections/home-section-list';
import { parseLooksPageParam } from '@/components/public/parse-looks-page-param';
import { EMPTY_HOME_COPY } from '@/components/public/public-copy';
import { PublicMessage } from '@/components/public/public-message';
import { HOME_PATH } from '@/components/public/public-nav-items';
import { PublicPage } from '@/components/public/public-page';
import { subscribeNewsletter } from '@/lib/newsletter/subscribe-newsletter-action';
import { buildSiteMetadata, siteDescription } from '@/lib/seo/build-outfit-metadata';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { getOutfitFeedPage, nextFeedPage } from '@/lib/seo/public-feed-loaders';
import { getHomePage } from '@/lib/seo/public-home-loaders';
import { getWebEnv } from '@/lib/web-env';
import hidden from '@/styles/visually-hidden.module.css';

// The published layout can change at any time and the API is not reachable during `next build`.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return buildSiteMetadata({ settings, siteUrl: getWebEnv().SITE_URL });
}

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Only known values reach the page; anything else in the URL is ignored.
const parseNewsletterResult = (value: string | string[] | undefined): NewsletterResult | undefined =>
  NEWSLETTER_RESULTS.find((result) => result === value);

export default async function HomePage({ searchParams }: HomePageProps) {
  const [settings, query] = await Promise.all([getPublicSettings(), searchParams]);

  if ((settings.homeMode ?? DEFAULT_HOME_MODE) === 'sections') {
    const home = await getHomePage();
    return (
      <PublicPage>
        <HomeSectionList
          sections={home.sections}
          siteUrl={getWebEnv().SITE_URL}
          seoTitle={settings.seoTitle}
          fallbackDescription={siteDescription(settings)}
          newsletter={{ action: subscribeNewsletter, result: parseNewsletterResult(query[NEWSLETTER_RESULT_PARAM]) }}
        />
      </PublicPage>
    );
  }

  const page = parseLooksPageParam(query.page);
  const feed = await getOutfitFeedPage(page, settings.looksPageSize);
  if (!feed || feed.total === 0) {
    return (
      <PublicPage>
        <PublicMessage title={EMPTY_HOME_COPY.title} message={EMPTY_HOME_COPY.message} />
      </PublicPage>
    );
  }
  if (page > Math.ceil(feed.total / feed.size)) notFound();
  return (
    <>
      <h1 className={hidden.hidden}>{settings.seoTitle}</h1>
      <OutfitFeed outfits={feed.items} nextPage={nextFeedPage(feed)} size={feed.size} basePath={HOME_PATH} />
    </>
  );
}
