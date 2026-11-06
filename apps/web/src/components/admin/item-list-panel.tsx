'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { EditorItem, Side } from '@/hooks/admin/editor-state';
import { itemsOnSide } from '@/hooks/admin/editor-state';
import styles from './admin.module.css';
import editorStyles from './admin-editor.module.css';
import type { FieldErrors } from './validation-messages';
import { SortableItemRow } from './sortable-item-row';

interface ItemListPanelProps {
  items: EditorItem[];
  selectedId: string | null;
  errors: FieldErrors;
  onSelect: (id: string) => void;
  onMove: (id: string, side: Side, index: number) => void;
}

const SIDES: { side: Side; label: string }[] = [
  { side: 'left', label: 'Bên trái' },
  { side: 'right', label: 'Bên phải' },
];

function SideGroup({ side, label, ...rest }: { side: Side; label: string } & Omit<ItemListPanelProps, 'onMove'>) {
  const { setNodeRef, isOver } = useDroppable({ id: side });
  const sideItems = itemsOnSide(rest.items, side);
  const hasError = (item: EditorItem) =>
    Object.keys(rest.errors).some((key) => key.startsWith(`items.${rest.items.indexOf(item)}.`));

  return (
    <section aria-labelledby={`side-${side}-title`}>
      <h3 id={`side-${side}-title`} className={styles.panelTitle}>
        {label}
      </h3>
      <SortableContext items={sideItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className={`${editorStyles.itemList} ${isOver ? editorStyles.itemListOver : ''}`}>
          {sideItems.map((item) => (
            <SortableItemRow
              key={item.id}
              item={item}
              selected={item.id === rest.selectedId}
              invalid={hasError(item)}
              onSelect={() => rest.onSelect(item.id)}
            />
          ))}
          {sideItems.length === 0 ? <li className={styles.hint}>Kéo món vào đây</li> : null}
        </ul>
      </SortableContext>
    </section>
  );
}

export function ItemListPanel({ onMove, ...props }: ItemListPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const overItem = props.items.find((item) => item.id === over.id);
    if (overItem) {
      onMove(String(active.id), overItem.side, itemsOnSide(props.items, overItem.side).findIndex((item) => item.id === over.id));
    } else if (over.id === 'left' || over.id === 'right') {
      onMove(String(active.id), over.id, Number.MAX_SAFE_INTEGER);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      {SIDES.map(({ side, label }) => (
        <SideGroup key={side} side={side} label={label} {...props} />
      ))}
    </DndContext>
  );
}
