import type { HeroSlide, HomeSectionOf } from '@under30ss/shared';
import { PublicSmartLink } from '@/components/public/public-smart-link';
import { HOME_SECTION_COPY } from './home-section-copy';
import { getHeroPictureProps } from './hero-image-props';
import { HeroSliderAutoplay } from './hero-slider-autoplay';
import { SectionShell, type SectionViewProps } from './section-shell';
import styles from './hero-slider.module.css';

function HeroSlideItem({ slide, index, total, isLcp }: { slide: HeroSlide; index: number; total: number; isLcp: boolean }) {
  const { img, mobileSrcSet } = getHeroPictureProps(slide, isLcp);
  const hasCaption = slide.heading || slide.text || (slide.ctaLabel && slide.ctaHref);
  return (
    <div
      className={styles.slide}
      role="group"
      aria-roledescription="slide"
      aria-label={HOME_SECTION_COPY.slider.slideLabel(index + 1, total)}
    >
      <picture>
        {mobileSrcSet ? <source media="(max-width: 767px)" srcSet={mobileSrcSet} /> : null}
        {/* getImageProps output: next/image cannot render <picture> sources itself. */}
        <img {...img} className={styles.image} />
      </picture>
      {hasCaption ? (
        <div className={styles.caption}>
          {slide.heading ? <h2 className={styles.heading}>{slide.heading}</h2> : null}
          {slide.text ? <p className={styles.text}>{slide.text}</p> : null}
          {slide.ctaLabel && slide.ctaHref ? (
            <PublicSmartLink href={slide.ctaHref} className={styles.pill}>
              {slide.ctaLabel}
            </PublicSmartLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function HeroSliderView({ section, headingId, priority, mode }: SectionViewProps<HomeSectionOf<'HeroSlider'>>) {
  const { id, label, slides, autoplaySeconds } = section.props;
  const shown = slides.filter((slide) => slide.image.url);
  if (shown.length === 0) return null;
  const name = label?.trim() || HOME_SECTION_COPY.slider.defaultLabel;
  return (
    <SectionShell sectionId={id} headingId={headingId} label={name} roleDescription="carousel">
      <HeroSliderAutoplay count={shown.length} seconds={autoplaySeconds} autoplay={mode === 'public'} label={name}>
        {shown.map((slide, index) => (
          <HeroSlideItem key={index} slide={slide} index={index} total={shown.length} isLcp={priority && index === 0} />
        ))}
      </HeroSliderAutoplay>
    </SectionShell>
  );
}
