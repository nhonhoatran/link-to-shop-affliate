import type { CSSProperties } from 'react';
import type { PublicOutfitCardDto } from '@under30ss/shared';
import motion from '@/styles/motion-primitives.module.css';
import { OutfitCard, type OutfitCardHeadingLevel } from './outfit-card';
import { OUTFIT_GRID_DESKTOP_COLUMNS, OUTFIT_GRID_MEDIUM_COLUMNS } from './outfit-grid-columns';
import styles from './outfit-card.module.css';

interface OutfitCardGridProps {
  items: readonly PublicOutfitCardDto[];
  headingLevel: OutfitCardHeadingLevel;
  /** Also raises the fetch priority of the first row; use only when the grid is the main content. */
  highPriorityFirstRow?: boolean;
  columnsDesktop?: number;
}

export function OutfitCardGrid({
  items,
  headingLevel,
  highPriorityFirstRow = false,
  columnsDesktop = OUTFIT_GRID_DESKTOP_COLUMNS,
}: OutfitCardGridProps) {
  const gridStyle = {
    '--outfit-columns': columnsDesktop,
    '--outfit-columns-md': Math.min(OUTFIT_GRID_MEDIUM_COLUMNS, columnsDesktop),
  } as CSSProperties;
  return (
    <ul className={styles.grid} style={gridStyle}>
      {items.map((outfit, index) => (
        <li key={outfit.slug} className={`${styles.cell} ${motion.revealOnScroll}`}>
          <OutfitCard
            outfit={outfit}
            headingLevel={headingLevel}
            firstRow={index < columnsDesktop}
            highPriority={highPriorityFirstRow && index === 0}
          />
        </li>
      ))}
    </ul>
  );
}
