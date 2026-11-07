import type { PublicOutfitItemDto } from '@under30ss/shared';
import { LookbookItemCard } from './lookbook-item-card';
import styles from './lookbook.module.css';

interface Props {
  side: 'left' | 'right';
  items: readonly PublicOutfitItemDto[];
  itemHeading: 'h2' | 'h3';
  indexOffset?: number;
}

export function LookbookItemColumn({ side, items, itemHeading, indexOffset = 0 }: Props) {
  return (
    <ul className={styles.column} data-side={side}>
      {items.map((item, i) => (
        <LookbookItemCard key={item.id} item={item} itemHeading={itemHeading} index={indexOffset + i} />
      ))}
    </ul>
  );
}
