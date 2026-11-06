'use client';

import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EditorItem } from '@/hooks/admin/editor-state';
import editorStyles from './admin-editor.module.css';
import listStyles from './admin-list.module.css';
import { StatusTag } from './field-error';

interface SortableItemRowProps {
  item: EditorItem;
  selected: boolean;
  invalid: boolean;
  onSelect: () => void;
}

export function SortableItemRow({ item, selected, invalid, onSelect }: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const missingAnchor = !item.anchor;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${editorStyles.itemRow} ${selected ? editorStyles.itemRowSelected : ''} ${
        invalid ? editorStyles.itemRowInvalid : ''
      } ${isDragging ? editorStyles.itemRowDragging : ''}`}
      data-invalid={invalid || undefined}
    >
      <button type="button" className={editorStyles.dragHandle} aria-label={`Kéo để sắp xếp ${item.name}`} {...attributes} {...listeners}>
        ⋮⋮
      </button>
      <div className={listStyles.thumb}>
        <Image src={item.image.url} alt="" fill sizes="48px" />
      </div>
      <button type="button" className={editorStyles.itemSelect} aria-pressed={selected} onClick={onSelect}>
        <span>{item.name || 'Món chưa có tên'}</span>
        {missingAnchor ? <StatusTag tone="warning">Chưa đặt điểm</StatusTag> : null}
        {invalid ? <StatusTag tone="error">Cần sửa</StatusTag> : null}
      </button>
    </li>
  );
}
