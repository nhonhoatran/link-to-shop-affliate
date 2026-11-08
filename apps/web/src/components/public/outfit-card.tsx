import Image from 'next/image';
import Link from 'next/link';
import type { PublicOutfitCardDto } from '@under30ss/shared';
import { outfitPath } from '@/lib/seo/absolute-url';
import { OUTFIT_CARD_IMAGE_SIZES } from './outfit-card-image-sizes';
import styles from './outfit-card.module.css';

export type OutfitCardHeadingLevel = 'h2' | 'h3';

interface OutfitCardProps {
  outfit: PublicOutfitCardDto;
  headingLevel: OutfitCardHeadingLevel;
  firstRow?: boolean;
  highPriority?: boolean;
}

export function OutfitCard({ outfit, headingLevel, firstRow = false, highPriority = false }: OutfitCardProps) {
  const Heading = headingLevel;
  const { modelImage, title, slug } = outfit;
  return (
    <Link href={outfitPath(slug)} className={styles.card}>
      <span className={styles.imageFrame}>
        <Image
          src={modelImage.url}
          alt=""
          width={modelImage.width}
          height={modelImage.height}
          sizes={OUTFIT_CARD_IMAGE_SIZES}
          className={styles.image}
          {...(firstRow && highPriority ? { loading: 'eager' as const, fetchPriority: 'high' as const } : {})}
        />
      </span>
      <Heading className={styles.title}>{title}</Heading>
    </Link>
  );
}
