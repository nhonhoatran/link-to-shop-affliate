import type { ComponentType } from 'react';
import { HOME_SECTION_META, type ResolvedHomeSection } from '@under30ss/shared';
import { PublicMessage } from '@/components/public/public-message';
import { EMPTY_HOME_COPY } from '@/components/public/public-copy';
import { HOME_SECTION_VIEWS } from './home-section-views';
import { srOnlyClass, type NewsletterFormState, type SectionMode, type SectionViewProps } from './section-shell';

interface HomeSectionListProps {
  sections: readonly ResolvedHomeSection[];
  siteUrl: string;
  /** Text of the visually hidden page heading. */
  seoTitle: string;
  mode?: SectionMode;
  fallbackDescription?: string;
  newsletter?: NewsletterFormState;
}

export function HomeSectionList({ sections, siteUrl, seoTitle, mode = 'public', fallbackDescription, newsletter }: HomeSectionListProps) {
  // Unknown types can arrive from a newer API than this build; skip them instead of failing the page.
  const known = sections.filter((section) => {
    const isKnown = Object.hasOwn(HOME_SECTION_VIEWS, section.type);
    if (!isKnown) console.warn(`Skipping unknown home section type: ${String(section.type)}`);
    return isKnown;
  });
  if (known.length === 0 && mode === 'public') {
    return <PublicMessage title={EMPTY_HOME_COPY.title} message={EMPTY_HOME_COPY.message} />;
  }
  // The first section that shows an image holds the LCP; text-only sections above it never do.
  const lcpIndex = known.findIndex((section) => HOME_SECTION_META[section.type].hasImage);
  return (
    <>
      {mode === 'public' ? <h1 className={srOnlyClass}>{seoTitle}</h1> : null}
      {known.map((section, index) => {
        // The map is keyed by `type`, so the view always matches the section; TypeScript cannot correlate them here.
        const View = HOME_SECTION_VIEWS[section.type] as ComponentType<SectionViewProps<ResolvedHomeSection>>;
        return (
          <View
            key={section.props.id}
            section={section}
            headingId={`section-${section.props.id}`}
            priority={index === lcpIndex}
            siteUrl={siteUrl}
            mode={mode}
            fallbackDescription={fallbackDescription}
            newsletter={newsletter}
          />
        );
      })}
    </>
  );
}
