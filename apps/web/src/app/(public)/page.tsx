import type { Metadata } from 'next';
import { NEWSLETTER_RESULTS, NEWSLETTER_RESULT_PARAM, type NewsletterResult } from '@under30ss/shared';
import { HomeSectionList } from '@/components/home-sections/home-section-list';
import { PublicPage } from '@/components/public/public-page';
import { subscribeNewsletter } from '@/lib/newsletter/subscribe-newsletter-action';
import { getWebEnv } from '@/lib/web-env';
import { buildSiteMetadata, siteDescription } from '@/lib/seo/build-outfit-metadata';
import { getPublicSettings } from '@/lib/seo/public-data-loaders';
import { getHomePage } from '@/lib/seo/public-home-loaders';

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
  const [home, settings, query] = await Promise.all([getHomePage(), getPublicSettings(), searchParams]);
  const result = parseNewsletterResult(query[NEWSLETTER_RESULT_PARAM]);
  return (
    <PublicPage>
      <HomeSectionList
        sections={home.sections}
        siteUrl={getWebEnv().SITE_URL}
        seoTitle={settings.seoTitle}
        fallbackDescription={siteDescription(settings)}
        newsletter={{ action: subscribeNewsletter, result }}
      />
    </PublicPage>
  );
}
