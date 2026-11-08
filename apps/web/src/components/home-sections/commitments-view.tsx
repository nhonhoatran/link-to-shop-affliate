import type { CSSProperties } from 'react';
import { HOME_SECTION_META, type HomeSectionOf } from '@under30ss/shared';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import { COMMITMENT_ICON_COMPONENTS } from './commitment-icons';
import { SectionShell, type SectionViewProps } from './section-shell';
import styles from './commitments.module.css';

export function CommitmentsView({ section, headingId }: SectionViewProps<HomeSectionOf<'Commitments'>>) {
  const { id, items } = section.props;
  const style = { '--commitment-columns': items.length } as CSSProperties;
  return (
    <SectionShell sectionId={id} headingId={headingId} label={HOME_SECTION_META.Commitments.label}>
      <ul className={styles.list} style={style}>
        {items.map((item, index) => (
          <li key={index} className={styles.item}>
            <span className={styles.icon}>
              <DecorativeIcon icon={COMMITMENT_ICON_COMPONENTS[item.icon]} size={28} />
            </span>
            <p className={styles.itemTitle}>{item.title}</p>
            <p className={styles.itemText}>{item.text}</p>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
