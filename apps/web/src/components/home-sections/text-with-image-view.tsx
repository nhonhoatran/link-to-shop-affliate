import Image from 'next/image';
import type { HomeSectionOf } from '@under30ss/shared';
import { PublicSmartLink } from '@/components/public/public-smart-link';
import buttons from '@/components/public/public-button.module.css';
import { SectionShell, type SectionViewProps } from './section-shell';
import { splitParagraphs } from './split-paragraphs';
import styles from './text-with-image.module.css';

// Half the container from 768px, full width below; the container stops at --client-container-max.
const IMAGE_SIZES = '(min-width: 768px) 50vw, 100vw';

export function TextWithImageView({ section, headingId, priority }: SectionViewProps<HomeSectionOf<'TextWithImage'>>) {
  const { id, eyebrow, heading, body, image, alt, imagePosition, ctaLabel, ctaHref } = section.props;
  const imageUrl = image?.url;
  return (
    <SectionShell sectionId={id} headingId={headingId} eyebrow={eyebrow} title={heading}>
      <div className={`${styles.layout} ${imagePosition === 'left' ? styles.imageLeft : ''}`}>
        <div className={styles.text}>
          {splitParagraphs(body).map((paragraph, index) => (
            <p key={index} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
          {ctaLabel && ctaHref ? (
            <div className={styles.actions}>
              <PublicSmartLink href={ctaHref} className={`${buttons.button} ${buttons.primary}`}>
                {ctaLabel}
              </PublicSmartLink>
            </div>
          ) : null}
        </div>
        {image && imageUrl ? (
          <div className={styles.imageFrame}>
            <Image
              src={imageUrl}
              alt={alt ?? ''}
              width={image.width}
              height={image.height}
              sizes={IMAGE_SIZES}
              className={styles.image}
              {...(priority ? { loading: 'eager' as const, fetchPriority: 'high' as const } : {})}
            />
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}
