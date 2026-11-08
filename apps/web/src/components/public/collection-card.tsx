import Image from 'next/image';
import Link from 'next/link';
import type { PublicCollectionCardDto } from '@under30ss/shared';
import { collectionPath } from '@/lib/seo/absolute-url';
import type { OutfitCardHeadingLevel } from './outfit-card';
import { collectionCardImageSizes } from './collection-card-image-sizes';
import styles from './collection-card.module.css';

interface CollectionCardProps {
  collection: PublicCollectionCardDto;
  headingLevel: OutfitCardHeadingLevel;
  columnsDesktop: number;
  firstRow?: boolean;
  highPriority?: boolean;
}

export function CollectionCard({
  collection,
  headingLevel,
  columnsDesktop,
  firstRow = false,
  highPriority = false,
}: CollectionCardProps) {
  const Heading = headingLevel;
  const { coverImage, name, slug } = collection;
  return (
    <Link href={collectionPath(slug)} className={styles.card}>
      <span className={styles.imageFrame}>
        <Image
          src={coverImage.url}
          alt=""
          width={coverImage.width}
          height={coverImage.height}
          sizes={collectionCardImageSizes(columnsDesktop)}
          className={styles.image}
          {...(firstRow ? { loading: 'eager' as const, ...(highPriority ? { fetchPriority: 'high' as const } : {}) } : {})}
        />
      </span>
      <Heading className={styles.title}>{name}</Heading>
    </Link>
  );
}
