'use client';

import Image from 'next/image';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { Anchor, ImageWithUrl } from '@under30ss/shared';
import type { EditorItem } from '@/hooks/admin/editor-state';
import styles from './admin.module.css';
import editorStyles from './admin-editor.module.css';
import { anchorFromPointer } from './anchor-from-pointer';

interface AnchorPlacementCanvasProps {
  modelImage: ImageWithUrl;
  items: EditorItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAnchor: (id: string, anchor: Anchor) => void;
}

const ARROW_STEP: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const CENTER: Anchor = { x: 50, y: 50 };

export function AnchorPlacementCanvas({ modelImage, items, selectedId, onSelect, onAnchor }: AnchorPlacementCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const draggingId = useRef<string | null>(null);
  const selected = items.find((item) => item.id === selectedId);

  const place = (id: string, clientX: number, clientY: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    const anchor = rect && anchorFromPointer(clientX, clientY, rect);
    if (anchor) onAnchor(id, anchor);
  };

  const onKeyDown = (event: KeyboardEvent, item: EditorItem) => {
    const step = ARROW_STEP[event.key];
    if (!step || !item.anchor) return;
    event.preventDefault();
    const clamp = (value: number) => Math.min(100, Math.max(0, value));
    onAnchor(item.id, { x: clamp(item.anchor.x + step[0]), y: clamp(item.anchor.y + step[1]) });
  };

  const dotHandlers = (item: EditorItem) => ({
    onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onSelect(item.id);
      draggingId.current = item.id;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: PointerEvent) => {
      if (draggingId.current === item.id) place(item.id, event.clientX, event.clientY);
    },
    onPointerUp: () => {
      draggingId.current = null;
    },
    onKeyDown: (event: KeyboardEvent) => onKeyDown(event, item),
  });

  return (
    <div>
      <p className={styles.hint} role="status">
        {selected
          ? `Bấm lên người mẫu để đặt điểm cho "${selected.name}", kéo chấm để chỉnh`
          : 'Chọn một món ở danh sách, rồi bấm lên người mẫu để đặt điểm'}
      </p>
      {selected && !selected.anchor ? (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => onAnchor(selected.id, CENTER)}
        >
          Đặt điểm ở giữa ảnh
        </button>
      ) : null}
      <div
        ref={boxRef}
        className={editorStyles.canvas}
        data-testid="anchor-canvas"
        onClick={(event) => selected && place(selected.id, event.clientX, event.clientY)}
      >
        <Image
          src={modelImage.url}
          alt="Ảnh người mẫu"
          width={modelImage.width}
          height={modelImage.height}
          sizes="(min-width: 1100px) 33vw, 100vw"
          draggable={false}
        />
        {items.map((item) =>
          item.anchor ? (
            <button
              key={item.id}
              type="button"
              aria-label={`Điểm của ${item.name}`}
              aria-pressed={item.id === selectedId}
              className={`${editorStyles.dot} ${item.id === selectedId ? editorStyles.dotSelected : ''}`}
              style={{ left: `${item.anchor.x}%`, top: `${item.anchor.y}%` }}
              {...dotHandlers(item)}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
