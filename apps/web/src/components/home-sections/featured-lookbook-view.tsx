import type { HomeSectionOf, PublicOutfitDto } from '@under30ss/shared';
import { LookbookLayout } from '@/components/lookbook';
import { LookbookCard } from '@/components/public/lookbook-card';
import { OutfitJsonLdScript } from '@/lib/seo/outfit-json-ld-script';
import { SectionShell, type SectionViewProps } from './section-shell';

type FeaturedLookbookSection = HomeSectionOf<'FeaturedLookbook'> & { data: { outfit: PublicOutfitDto } };

export function FeaturedLookbookView({
  section,
  headingId,
  priority,
  siteUrl,
  mode,
  fallbackDescription,
}: SectionViewProps<FeaturedLookbookSection>) {
  const { outfit } = section.data;
  return (
    <SectionShell sectionId={section.props.id} headingId={headingId} label={outfit.title}>
      {mode === 'public' ? (
        <OutfitJsonLdScript
          outfit={outfit}
          siteUrl={siteUrl}
          description={outfit.seoDescription?.trim() || fallbackDescription}
        />
      ) : null}
      <LookbookCard>
        <LookbookLayout outfit={outfit} headingLevel="h2" preload={priority} />
      </LookbookCard>
    </SectionShell>
  );
}
