import type { Metadata } from 'next';
import { LookbookLayout } from '@/components/lookbook';
import { LookbookCard } from '@/components/public/lookbook-card';
import { PublicPage } from '@/components/public/public-page';
import { PublicMessage } from '@/components/public/public-message';
import { RelatedOutfitsSection } from '@/components/public/related-outfits-section';
import { EMPTY_HOME_COPY } from '@/components/public/public-copy';
import { getWebEnv } from '@/lib/web-env';
import { buildOutfitMetadata, buildSiteMetadata } from '@/lib/seo/build-outfit-metadata';
import { OutfitJsonLdScript } from '@/lib/seo/outfit-json-ld-script';
import { getFeaturedOutfit, getPublicSettings } from '@/lib/seo/public-data-loaders';

// The featured outfit can change at any time and the API is not reachable during `next build`.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const [outfit, settings] = await Promise.all([getFeaturedOutfit(), getPublicSettings()]);
  const siteUrl = getWebEnv().SITE_URL;
  return outfit ? buildOutfitMetadata({ outfit, settings, siteUrl }) : buildSiteMetadata({ settings, siteUrl });
}

export default async function HomePage() {
  const [outfit, settings] = await Promise.all([getFeaturedOutfit(), getPublicSettings()]);
  const related = <RelatedOutfitsSection count={settings.relatedOutfitsCount} excludeSlug={outfit?.slug} />;
  if (!outfit) {
    return (
      <PublicPage>
        <PublicMessage title={EMPTY_HOME_COPY.title} message={EMPTY_HOME_COPY.message} />
        {related}
      </PublicPage>
    );
  }
  return (
    <PublicPage>
      <OutfitJsonLdScript
        outfit={outfit}
        siteUrl={getWebEnv().SITE_URL}
        description={outfit.seoDescription?.trim() || settings.seoDescription}
      />
      <LookbookCard>
        <LookbookLayout outfit={outfit} headingLevel="h1" />
      </LookbookCard>
      {related}
    </PublicPage>
  );
}
