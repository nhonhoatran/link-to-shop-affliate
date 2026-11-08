import { HOME_SECTION_META, type HomeSection } from '@under30ss/shared';
import { HOME_EDITOR_COPY } from './home-editor-copy';

const firstText = (...candidates: unknown[]): string | undefined =>
  candidates.find((value): value is string => typeof value === 'string' && value.trim() !== '')?.trim();

/** First human-readable text of a section, used to tell cards of the same type apart. */
export function summarizeSection(section: HomeSection): string {
  switch (section.type) {
    case 'HeroSlider':
      return firstText(section.props.label, section.props.slides[0]?.heading, section.props.slides[0]?.alt) ?? HOME_EDITOR_COPY.noTitle;
    case 'TextWithImage':
    case 'CampaignBanner':
    case 'NewsletterSignup':
      return firstText(section.props.heading) ?? HOME_EDITOR_COPY.noTitle;
    case 'CollectionTiles':
    case 'OutfitList':
    case 'Faq':
    case 'Gallery':
      return firstText(section.props.title) ?? HOME_EDITOR_COPY.noTitle;
    case 'Commitments':
      return firstText(section.props.items[0]?.title) ?? HOME_EDITOR_COPY.noTitle;
    case 'Marquee':
      return firstText(section.props.label, section.props.items[0]?.text) ?? HOME_EDITOR_COPY.noTitle;
    case 'FeaturedLookbook':
      return '';
  }
}

/** Accessible name of a card, e.g. `Danh sách outfit "Outfit mới"`. */
export function sectionName(section: HomeSection): string {
  const label = HOME_SECTION_META[section.type].label;
  const summary = summarizeSection(section);
  return summary && summary !== HOME_EDITOR_COPY.noTitle ? `${label} "${summary}"` : label;
}
