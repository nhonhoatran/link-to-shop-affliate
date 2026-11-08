import Image from 'next/image';
import Link from 'next/link';
import type { HomeSectionOf, PublicOutfitCardDto } from '@under30ss/shared';
import { outfitPath } from '@/lib/seo/absolute-url';
import { gallerySizesFor } from './gallery-image-sizes';
import { galleryMosaicSpans } from './gallery-mosaic-layout';
import { SectionShell, type SectionViewProps } from './section-shell';
import styles from './gallery-mosaic.module.css';

type GallerySection = HomeSectionOf<'Gallery'> & { data: { items: PublicOutfitCardDto[] } };

export function GalleryView({ section, headingId, priority }: SectionViewProps<GallerySection>) {
  const { id, eyebrow, title, note } = section.props;
  const { items } = section.data;
  if (items.length === 0) return null;
  const spans = galleryMosaicSpans(items.length);
  return (
    <SectionShell sectionId={id} headingId={headingId} eyebrow={eyebrow} title={title}>
      {note ? <p className={styles.note}>{note}</p> : null}
      <ul className={styles.mosaic}>
        {items.map((outfit, index) => {
          const span = spans[index] ?? { desktop: 1, mobile: 1 };
          return (
            <li key={outfit.slug} className={`${styles[`desktop${span.desktop}`]} ${styles[`mobile${span.mobile}`]}`}>
              <Link href={outfitPath(outfit.slug)} className={styles.tile}>
                <Image
                  src={outfit.modelImage.url}
                  alt={outfit.title}
                  fill
                  sizes={gallerySizesFor(span)}
                  className={styles.image}
                  {...(priority && index === 0 ? { preload: true } : {})}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
