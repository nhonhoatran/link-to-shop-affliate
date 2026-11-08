import type { HomeSection } from '@under30ss/shared';

type SectionImage = { key: string; width: number; height: number; url?: string | undefined };
type MapImage = (image: SectionImage) => SectionImage;

/** Applies `map` to every image a section carries; sections without images are returned untouched. */
const mapSectionImages = (section: HomeSection, map: MapImage): HomeSection => {
  if (section.type === 'HeroSlider') {
    const slides = section.props.slides.map((slide) => ({
      ...slide,
      image: map(slide.image),
      ...(slide.mobileImage ? { mobileImage: map(slide.mobileImage) } : {}),
    }));
    return { ...section, props: { ...section.props, slides } };
  }
  if (section.type === 'TextWithImage' && section.props.image) {
    return { ...section, props: { ...section.props, image: map(section.props.image) } };
  }
  return section;
};

/** The URL is derived from the key at read time, so it is never stored. */
export const stripSectionImageUrls = (section: HomeSection): HomeSection =>
  mapSectionImages(section, ({ key, width, height }) => ({ key, width, height }));

export const attachSectionImageUrls = (section: HomeSection, resolveUrl: (key: string) => string): HomeSection =>
  mapSectionImages(section, ({ key, width, height }) => ({ key, width, height, url: resolveUrl(key) }));

export const listSectionImageKeys = (section: HomeSection): { path: string; key: string }[] => {
  const found: { path: string; key: string }[] = [];
  if (section.type === 'HeroSlider') {
    section.props.slides.forEach((slide, index) => {
      found.push({ path: `slides.${index}.image.key`, key: slide.image.key });
      if (slide.mobileImage) found.push({ path: `slides.${index}.mobileImage.key`, key: slide.mobileImage.key });
    });
  } else if (section.type === 'TextWithImage' && section.props.image) {
    found.push({ path: 'image.key', key: section.props.image.key });
  }
  return found;
};
