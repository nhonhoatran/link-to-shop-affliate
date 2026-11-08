import Image from 'next/image';
import type { PublicCollectionDto } from '@under30ss/shared';
import styles from './collection-header.module.css';

const COVER_SIZES = '(min-width: 768px) 40vw, 100vw';

export function CollectionHeader({ collection }: { collection: PublicCollectionDto }) {
  const { coverImage, name, description } = collection;
  const paragraphs = description?.split(/\n+/).filter((line) => line.trim() !== '') ?? [];
  return (
    <header className={styles.header}>
      <div className={styles.frame}>
        <Image
          src={coverImage.url}
          alt=""
          width={coverImage.width}
          height={coverImage.height}
          sizes={COVER_SIZES}
          loading="eager"
          fetchPriority="high"
          className={styles.cover}
        />
      </div>
      <div className={styles.text}>
        <h1 className={styles.title}>{name}</h1>
        {paragraphs.map((line, index) => (
          <p key={index} className={styles.description}>
            {line}
          </p>
        ))}
      </div>
    </header>
  );
}
