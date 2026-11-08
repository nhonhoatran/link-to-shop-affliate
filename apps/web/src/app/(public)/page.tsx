import type { Metadata } from 'next';
import { HomeSectionList } from '@/components/home-sections/home-section-list';
import { PublicPage } from '@/components/public/public-page';
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

export default async function HomePage() {
  const [home, settings] = await Promise.all([getHomePage(), getPublicSettings()]);
  return (
    <PublicPage>
      <HomeSectionList
        sections={home.sections}
        siteUrl={getWebEnv().SITE_URL}
        seoTitle={settings.seoTitle}
        fallbackDescription={siteDescription(settings)}
      />
    </PublicPage>
  );
}
