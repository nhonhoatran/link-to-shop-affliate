import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LookbookLayout } from '@/components/lookbook';
import { LookBreadcrumb } from '@/components/public/look-breadcrumb';
import { LookbookCard } from '@/components/public/lookbook-card';
import { PublicPage } from '@/components/public/public-page';
import { RelatedOutfitsSection } from '@/components/public/related-outfits-section';
import { getWebEnv } from '@/lib/web-env';
import { buildOutfitMetadata } from '@/lib/seo/build-outfit-metadata';
import { OutfitJsonLdScript } from '@/lib/seo/outfit-json-ld-script';
import { getOutfitBySlug, getPublicSettings } from '@/lib/seo/public-data-loaders';

interface LookPageProps {
  params: Promise<{ slug: string }>;
}

// Not prerendered at build (API may be down): rendered on first request, then cached and
// refreshed by /api/revalidate.
export async function generateMetadata({ params }: LookPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [outfit, settings] = await Promise.all([getOutfitBySlug(slug), getPublicSettings()]);
  if (!outfit) notFound();
  return buildOutfitMetadata({ outfit, settings, siteUrl: getWebEnv().SITE_URL });
}

export default async function LookPage({ params }: LookPageProps) {
  const { slug } = await params;
  const [outfit, settings] = await Promise.all([getOutfitBySlug(slug), getPublicSettings()]);
  if (!outfit) notFound();
  return (
    <PublicPage>
      <OutfitJsonLdScript
        outfit={outfit}
        siteUrl={getWebEnv().SITE_URL}
        description={outfit.seoDescription?.trim() || settings.seoDescription}
      />
      <LookBreadcrumb title={outfit.title} />
      <LookbookCard>
        <LookbookLayout outfit={outfit} headingLevel="h1" />
      </LookbookCard>
      <RelatedOutfitsSection count={settings.relatedOutfitsCount} excludeSlug={outfit.slug} />
    </PublicPage>
  );
}
