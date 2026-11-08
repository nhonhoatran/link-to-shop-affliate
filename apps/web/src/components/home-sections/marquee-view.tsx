import type { CSSProperties } from 'react';
import type { HomeSectionOf } from '@under30ss/shared';
import { HOME_SECTION_COPY } from './home-section-copy';
import { SectionShell, type SectionViewProps } from './section-shell';
import styles from './marquee.module.css';

type MarqueeItems = HomeSectionOf<'Marquee'>['props']['items'];

function MarqueeGroup({ items, hidden }: { items: MarqueeItems; hidden?: boolean }) {
  return (
    <ul className={styles.group} {...(hidden ? { 'aria-hidden': true } : {})}>
      {items.map((item, index) => (
        <li key={index} className={styles.item}>
          {item.text}
        </li>
      ))}
    </ul>
  );
}

export function MarqueeView({ section, headingId }: SectionViewProps<HomeSectionOf<'Marquee'>>) {
  const { id, label, items, durationSeconds } = section.props;
  const toggleId = `marquee-pause-${id}`;
  const style = { '--marquee-duration': `${durationSeconds}s` } as CSSProperties;
  return (
    <SectionShell sectionId={id} headingId={headingId} label={label?.trim() || HOME_SECTION_COPY.marquee.defaultLabel}>
      <div className={styles.marquee} style={style}>
        <input id={toggleId} type="checkbox" className={styles.toggle} aria-label={HOME_SECTION_COPY.marquee.toggleLabel} />
        <label htmlFor={toggleId} className={styles.control}>
          <span className={styles.pauseText}>{HOME_SECTION_COPY.marquee.pause}</span>
          <span className={styles.playText}>{HOME_SECTION_COPY.marquee.resume}</span>
        </label>
        <div className={styles.viewport}>
          <div className={styles.track}>
            <MarqueeGroup items={items} />
            <MarqueeGroup items={items} hidden />
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
