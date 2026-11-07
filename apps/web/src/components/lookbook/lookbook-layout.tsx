import { compareOutfitItems, type PublicOutfitDto } from '@under30ss/shared';
import { LookbookInteractions } from './lookbook-interactions';
import { LookbookItemColumn } from './lookbook-item-column';
import { LookbookModelFigure } from './lookbook-model-figure';
import styles from './lookbook.module.css';

export interface LookbookLayoutProps {
  outfit: PublicOutfitDto;
  headingLevel?: 'h1' | 'h2';
}

export function LookbookLayout({ outfit, headingLevel = 'h1' }: LookbookLayoutProps) {
  const Title = headingLevel;
  const itemHeading = headingLevel === 'h1' ? 'h2' : 'h3';
  const sorted = [...outfit.items].sort(compareOutfitItems);
  const left = sorted.filter((i) => i.side === 'left');
  const right = sorted.filter((i) => i.side === 'right');
  return (
    <section className={styles.root} data-lookbook>
      <Title className={styles.title}>{outfit.title}</Title>
      <LookbookItemColumn side="left" items={left} itemHeading={itemHeading} />
      <LookbookModelFigure outfit={{ ...outfit, items: sorted }} />
      <LookbookItemColumn side="right" items={right} itemHeading={itemHeading} indexOffset={left.length} />
      <LookbookInteractions />
    </section>
  );
}
