'use client';

import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HOME_SECTION_META, type HomeSection } from '@under30ss/shared';
import { DecorativeIcon } from '@/components/ui/decorative-icon';
import styles from '../admin.module.css';
import { StatusTag } from '../field-error';
import { HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import css from './section-card.module.css';
import { sectionName, summarizeSection } from './section-summary';

interface SectionCardProps {
  section: HomeSection;
  index: number;
  count: number;
  selected: boolean;
  invalid: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  /** The section form, shown while the card is selected. */
  children: ReactNode;
}

const secondary = `${styles.btn} ${styles.btnSecondary}`;

export function SectionCard({ section, index, count, selected, invalid, onSelect, onToggleVisible, onMove, onRemove, children }: SectionCardProps) {
  const id = section.props.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const name = sectionName(section);
  const visible = section.props.visible;
  const formId = `section-form-${id}`;
  const classes = [css.card, selected ? css.selected : '', invalid ? css.invalid : '', isDragging ? css.dragging : '']
    .filter(Boolean)
    .join(' ');

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={classes} data-section-card={id}>
      <div className={css.top}>
        <button type="button" className={css.handle} aria-label={`Kéo để sắp xếp ${name}`} {...attributes} {...listeners}>
          <DecorativeIcon icon={GripVertical} />
        </button>
        <div className={`${css.heading} ${visible ? '' : css.dim}`}>
          <span className={css.type}>{HOME_SECTION_META[section.type].label}</span>
          <span className={css.summary}>{summarizeSection(section) || HOME_SECTION_META[section.type].description}</span>
          {!visible || invalid ? (
            <span className={css.tags}>
              {visible ? null : <StatusTag tone="warning">{COPY.hidden}</StatusTag>}
              {invalid ? <StatusTag tone="error">{COPY.needsFix}</StatusTag> : null}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          aria-label={`Hiện ${name} trên trang chủ`}
          className={`${secondary} ${css.switch}`}
          onClick={onToggleVisible}
        >
          {COPY.show}
        </button>
      </div>
      <div className={css.actions}>
        <button type="button" className={secondary} aria-expanded={selected} aria-controls={formId} aria-label={`${selected ? COPY.close : COPY.edit} ${name}`} onClick={onSelect}>
          {selected ? COPY.close : COPY.edit}
        </button>
        <button type="button" className={secondary} data-move="up" aria-label={`Đưa ${name} lên`} disabled={index === 0} onClick={() => onMove(-1)}>
          {COPY.moveUp}
        </button>
        <button type="button" className={secondary} data-move="down" aria-label={`Đưa ${name} xuống`} disabled={index === count - 1} onClick={() => onMove(1)}>
          {COPY.moveDown}
        </button>
        <button type="button" className={secondary} aria-label={`Xoá ${name}`} onClick={onRemove}>
          {COPY.remove}
        </button>
      </div>
      {selected ? (
        <div id={formId} className={css.body}>
          {children}
        </div>
      ) : null}
    </li>
  );
}
