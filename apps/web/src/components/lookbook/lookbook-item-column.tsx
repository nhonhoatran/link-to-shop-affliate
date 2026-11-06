import type { PublicOutfitItemDto } from '@under30ss/shared';
import { LookbookItemCard } from './lookbook-item-card';
import styles from './lookbook.module.css';

interface Props {
  side: 'left' | 'right';
  items: readonly PublicOutfitItemDto[];
  itemHeading: 'h2' | 'h3';
}

export function LookbookItemColumn({ side, items, itemHeading }: Props) {
  return (
    <ul className={styles.column} data-side={side}>
      {items.map((item) => (
        <LookbookItemCard key={item.id} item={item} itemHeading={itemHeading} />
      ))}
    </ul>
  );
}
