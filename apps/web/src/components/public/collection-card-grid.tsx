import type { CSSProperties } from 'react';
import type { PublicCollectionCardDto } from '@under30ss/shared';
import motion from '@/styles/motion-primitives.module.css';
import { CollectionCard } from './collection-card';
import type { OutfitCardHeadingLevel } from './outfit-card';
import styles from './collection-card.module.css';

// Grid is 3 columns from 768px unless fewer are requested; see `.grid` in collection-card.module.css.
const MEDIUM_COLUMNS = 3;

interface CollectionCardGridProps {
  items: readonly PublicCollectionCardDto[];
  headingLevel: OutfitCardHeadingLevel;
  columnsDesktop?: number;
  /** Also raises the fetch priority of the first row; use only when the grid is the main content. */
  highPriorityFirstRow?: boolean;
}

export function CollectionCardGrid({
  items,
  headingLevel,
  columnsDesktop = MEDIUM_COLUMNS,
  highPriorityFirstRow = false,
}: CollectionCardGridProps) {
  const gridStyle = {
    '--collection-columns': columnsDesktop,
    '--collection-columns-md': Math.min(MEDIUM_COLUMNS, columnsDesktop),
  } as CSSProperties;
  return (
    <ul className={styles.grid} style={gridStyle}>
      {items.map((collection, index) => (
        <li key={collection.slug} className={`${styles.cell} ${motion.revealOnScroll}`}>
          <CollectionCard
            collection={collection}
            headingLevel={headingLevel}
            columnsDesktop={columnsDesktop}
            firstRow={index < columnsDesktop}
            highPriority={highPriorityFirstRow && index === 0}
          />
        </li>
      ))}
    </ul>
  );
}
