import Image from 'next/image';
import type { HomeSectionOf } from '@under30ss/shared';
import buttons from '@/components/public/public-button.module.css';
import { PublicSmartLink } from '@/components/public/public-smart-link';
import { SectionEyebrow, SectionShell, type SectionViewProps } from './section-shell';
import styles from './campaign-banner.module.css';

// Half the container from 768px, full width below; the container stops at --client-container-max.
const IMAGE_SIZES = '(min-width: 1264px) 600px, (min-width: 768px) 50vw, 100vw';

export function CampaignBannerView({ section, headingId, priority }: SectionViewProps<HomeSectionOf<'CampaignBanner'>>) {
  const { id, eyebrow, heading, body, image, alt, imagePosition, ctaLabel, ctaHref } = section.props;
  if (!image.url) return null;
  return (
    <SectionShell sectionId={id} headingId={headingId} labelledBy={headingId}>
      <div className={`${styles.banner} ${imagePosition === 'left' ? styles.imageLeft : ''}`}>
        <div className={styles.panel}>
          {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
          <h2 id={headingId} className={styles.heading}>
            {heading}
          </h2>
          {body ? <p className={styles.body}>{body}</p> : null}
          {ctaLabel && ctaHref ? (
            <PublicSmartLink href={ctaHref} className={`${buttons.button} ${buttons.onDark} ${styles.cta}`}>
              {ctaLabel}
            </PublicSmartLink>
          ) : null}
        </div>
        <div className={styles.frame}>
          <Image src={image.url} alt={alt} fill sizes={IMAGE_SIZES} className={styles.image} {...(priority ? { preload: true } : {})} />
        </div>
      </div>
    </SectionShell>
  );
}
