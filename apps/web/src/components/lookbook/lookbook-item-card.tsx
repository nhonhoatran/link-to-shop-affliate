import type { CSSProperties } from 'react';
import Image from 'next/image';
import type { PublicOutfitItemDto } from '@under30ss/shared';
import { ITEM_IMAGE_SIZES } from './lookbook-image-sizes';
import { affiliateLinkProps } from './lookbook-link-props';
import styles from './lookbook.module.css';
import motion from '@/styles/motion-primitives.module.css';

interface Props {
  item: PublicOutfitItemDto;
  itemHeading: 'h2' | 'h3';
  index: number;
}

export function LookbookItemCard({ item, itemHeading: Heading, index }: Props) {
  return (
    <li className={`${styles.item} ${motion.fadeUp}`} style={{ '--i': index } as CSSProperties}>
      <a {...affiliateLinkProps(item.affiliateUrl)} className={styles.card} data-item-id={item.id}>
        <span className={styles.cardImage} data-item-image>
          <Image
            src={item.image.url}
            alt={item.name}
            width={item.image.width}
            height={item.image.height}
            sizes={ITEM_IMAGE_SIZES}
          />
        </span>
        <Heading className={styles.itemName}>{item.name}</Heading>
        {item.subtitle ? <span className={styles.itemSubtitle} data-item-subtitle>{item.subtitle}</span> : null}
        {item.description ? <span className={styles.itemDescription} data-item-description>{item.description}</span> : null}
      </a>
    </li>
  );
}
