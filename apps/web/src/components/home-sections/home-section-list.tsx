import type { ComponentType } from 'react';
import type { ResolvedHomeSection } from '@under30ss/shared';
import { PublicMessage } from '@/components/public/public-message';
import { EMPTY_HOME_COPY } from '@/components/public/public-copy';
import { HOME_SECTION_VIEWS } from './home-section-views';
import { srOnlyClass, type SectionMode, type SectionViewProps } from './section-shell';

interface HomeSectionListProps {
  sections: readonly ResolvedHomeSection[];
  siteUrl: string;
  /** Text of the visually hidden page heading. */
  seoTitle: string;
  mode?: SectionMode;
  fallbackDescription?: string;
}

// Faq and Commitments carry no image, so they never hold the LCP.
const TEXT_ONLY_TYPES: ReadonlySet<string> = new Set(['Faq', 'Commitments']);

export function HomeSectionList({ sections, siteUrl, seoTitle, mode = 'public', fallbackDescription }: HomeSectionListProps) {
  // Unknown types can arrive from a newer API than this build; skip them instead of failing the page.
  const known = sections.filter((section) => {
    const isKnown = Object.hasOwn(HOME_SECTION_VIEWS, section.type);
    if (!isKnown) console.warn(`Skipping unknown home section type: ${String(section.type)}`);
    return isKnown;
  });
  if (known.length === 0 && mode === 'public') {
    return <PublicMessage title={EMPTY_HOME_COPY.title} message={EMPTY_HOME_COPY.message} />;
  }
  const lcpIndex = known.findIndex((section) => !TEXT_ONLY_TYPES.has(section.type));
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
          />
        );
      })}
    </>
  );
}
