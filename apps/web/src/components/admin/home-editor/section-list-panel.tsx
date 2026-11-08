'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { HomeSectionType } from '@under30ss/shared';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import styles from '../admin.module.css';
import { AdminPanel } from '../admin-panel';
import { ConfirmDialog } from '../confirm-dialog';
import type { FieldErrors } from '../validation-messages';
import { AddSectionDialog } from './add-section-dialog';
import { removeSectionMessage, removeSectionTitle, HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import css from './home-editor.module.css';
import { sectionErrors, sectionIdsWithErrors } from './map-layout-errors';
import { SectionCard } from './section-card';
import { SectionForm } from './section-form';
import {
  createReorderAnnouncements,
  movedAnnouncement,
  SCREEN_READER_INSTRUCTIONS,
} from './section-reorder-announcements';
import { sectionName } from './section-summary';
import { createSection, type HomeLayoutAction, type HomeLayoutState } from './use-home-layout-state';

interface SectionListPanelProps {
  state: HomeLayoutState;
  dispatch: Dispatch<HomeLayoutAction>;
  errors: FieldErrors;
}

type PendingFocus = { kind: 'move'; id: string; dir: 'up' | 'down' } | { kind: 'field'; id: string };

export function SectionListPanel({ state, dispatch, errors }: SectionListPanelProps) {
  const { content, selectedId } = state;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const addDialog = useModalDialog();
  const listRef = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<PendingFocus | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [removeId, setRemoveId] = useState<string | null>(null);

  const named = useMemo(() => content.map((section) => ({ id: section.props.id, name: sectionName(section) })), [content]);
  const announcements = useMemo(() => createReorderAnnouncements(named), [named]);
  const invalidIds = useMemo(() => sectionIdsWithErrors(errors, content), [errors, content]);
  const removing = content.find((section) => section.props.id === removeId);

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const card = listRef.current?.querySelector<HTMLElement>(`[data-section-card="${CSS.escape(pending.id)}"]`);
    if (!card) return;
    if (pending.kind === 'field') {
      card.scrollIntoView({ block: 'nearest' });
      card.querySelector<HTMLElement>('input:not([type="file"]):not([type="checkbox"]), textarea, select')?.focus();
      return;
    }
    // At either end one of the two buttons turns disabled; keep focus on the one that still works.
    const preferred = card.querySelector<HTMLButtonElement>(`[data-move="${pending.dir}"]`);
    const other = card.querySelector<HTMLButtonElement>(`[data-move="${pending.dir === 'up' ? 'down' : 'up'}"]`);
    (preferred && !preferred.disabled ? preferred : other)?.focus();
  }, [content]);

  useEffect(() => {
    if (!selectedId) return;
    listRef.current?.querySelector(`[data-section-card="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const moveTo = (id: string, to: number, dir?: 'up' | 'down') => {
    const from = content.findIndex((section) => section.props.id === id);
    if (from === -1 || to === from || to < 0 || to >= content.length) return;
    if (dir) pendingFocus.current = { kind: 'move', id, dir };
    const target = content[from];
    if (target) setAnnouncement(movedAnnouncement(sectionName(target), to + 1, content.length));
    dispatch({ type: 'move', id, to });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const to = content.findIndex((section) => section.props.id === over.id);
    if (to !== -1) dispatch({ type: 'move', id: String(active.id), to });
  };

  const add = (type: HomeSectionType) => {
    const section = createSection(type);
    pendingFocus.current = { kind: 'field', id: section.props.id };
    dispatch({ type: 'add', section });
  };

  return (
    <AdminPanel id="home-layout" title={COPY.layoutPanel}>
      {content.length === 0 ? <p className={styles.hint}>{COPY.emptyList}</p> : null}
      <DndContext
        id="home-sections"
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={content.map((section) => section.props.id)} strategy={verticalListSortingStrategy}>
          <ul ref={listRef} className={css.cardList}>
            {content.map((section, index) => {
              const id = section.props.id;
              return (
                <SectionCard
                  key={id}
                  section={section}
                  index={index}
                  count={content.length}
                  selected={id === selectedId}
                  invalid={invalidIds.has(id)}
                  onSelect={() => dispatch({ type: 'select', id: id === selectedId ? null : id })}
                  onToggleVisible={() => dispatch({ type: 'toggle', id })}
                  onMove={(delta) => moveTo(id, index + delta, delta < 0 ? 'up' : 'down')}
                  onRemove={() => setRemoveId(id)}
                >
                  <SectionForm
                    section={section}
                    errors={sectionErrors(errors, index)}
                    onChange={(patch) => dispatch({ type: 'update', id, patch })}
                  />
                </SectionCard>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>
      <p role="status" className={styles.srOnly}>
        {announcement}
      </p>
      <div className={styles.btnGroup}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addDialog.open}>
          {COPY.addSection}
        </button>
      </div>
      <AddSectionDialog dialog={addDialog} onPick={add} />
      <ConfirmDialog
        open={removing !== undefined}
        title={removing ? removeSectionTitle(sectionName(removing)) : ''}
        message={removeSectionMessage}
        confirmLabel={COPY.remove}
        danger
        onCancel={() => setRemoveId(null)}
        onConfirm={() => {
          if (removeId) dispatch({ type: 'remove', id: removeId });
          setRemoveId(null);
        }}
      />
    </AdminPanel>
  );
}
