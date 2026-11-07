import type { PublicOutfitCardDto } from '@under30ss/shared';
import motion from '@/styles/motion-primitives.module.css';
import { OutfitCard, type OutfitCardHeadingLevel } from './outfit-card';
import { OUTFIT_GRID_DESKTOP_COLUMNS } from './outfit-grid-columns';
import styles from './outfit-card.module.css';

interface OutfitCardGridProps {
  items: readonly PublicOutfitCardDto[];
  headingLevel: OutfitCardHeadingLevel;
  /** Also raises the fetch priority of the first row; use only when the grid is the main content. */
  highPriorityFirstRow?: boolean;
}

export function OutfitCardGrid({ items, headingLevel, highPriorityFirstRow = false }: OutfitCardGridProps) {
  return (
    <ul className={styles.grid}>
      {items.map((outfit, index) => (
        <li key={outfit.slug} className={`${styles.cell} ${motion.revealOnScroll}`}>
          <OutfitCard
            outfit={outfit}
            headingLevel={headingLevel}
            firstRow={index < OUTFIT_GRID_DESKTOP_COLUMNS}
            highPriority={highPriorityFirstRow}
          />
        </li>
      ))}
    </ul>
  );
}
