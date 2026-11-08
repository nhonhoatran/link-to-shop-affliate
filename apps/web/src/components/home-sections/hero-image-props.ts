import { getImageProps, type ImageProps } from 'next/image';
import type { HeroSlide } from '@under30ss/shared';

// The container stops at --client-container-max (1200px) plus 32px gutters.
const HERO_IMAGE_SIZES = '(min-width: 1264px) 1200px, 100vw';

type Loading = Pick<ImageProps, 'loading' | 'fetchPriority'>;

export interface HeroPictureProps {
  img: ReturnType<typeof getImageProps>['props'];
  /** Source for viewports below --bp-md when the slide has its own mobile image. */
  mobileSrcSet: string | null;
}

export function getHeroPictureProps(slide: HeroSlide, isLcp: boolean): HeroPictureProps {
  const build = (image: HeroSlide['image'], loading: Loading) =>
    getImageProps({
      src: image.url ?? '',
      alt: slide.alt,
      width: image.width,
      height: image.height,
      sizes: HERO_IMAGE_SIZES,
      ...loading,
    }).props;
  const mobile = slide.mobileImage?.url ? build(slide.mobileImage, { loading: 'lazy' }) : null;
  return {
    img: build(slide.image, isLcp ? { loading: 'eager', fetchPriority: 'high' } : { loading: 'lazy' }),
    mobileSrcSet: mobile ? (mobile.srcSet ?? mobile.src) : null,
  };
}
