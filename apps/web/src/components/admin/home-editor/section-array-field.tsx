'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { MediaUploadResponse } from '@under30ss/shared';
import styles from '../admin.module.css';
import formStyles from '../admin-form.module.css';
import { FieldError } from '../field-error';
import { MediaDropzone } from '../media-dropzone';
import type { ArraySpec } from './field-spec-types';
import type { FieldValues } from './field-values';
import { HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import { moveItem } from './move-section';
import cardStyles from './home-editor.module.css';

interface SectionArrayFieldProps {
  spec: ArraySpec;
  id: string;
  dataField: string;
  items: readonly FieldValues[];
  error: string | undefined;
  onChange: (items: FieldValues[]) => void;
  renderItem: (item: FieldValues, index: number, onItemChange: (next: FieldValues) => void) => ReactNode;
}

const secondary = `${styles.btn} ${styles.btnSecondary}`;

/** Repeatable group (slides, questions, commitments) with add, remove and Up/Down on every row. */
export function SectionArrayField({ spec, id, dataField, items, error, onChange, renderItem }: SectionArrayFieldProps) {
  const full = items.length >= spec.max;
  const atMin = items.length <= spec.min;
  const replaceAt = (index: number, next: FieldValues) => onChange(items.map((item, i) => (i === index ? next : item)));
  const hintId = `${id}-limit`;
  // Files in one batch upload one after another; each must append to the list as it is now, not as it was at drop time.
  const latestItems = useRef(items);
  useEffect(() => {
    latestItems.current = items;
  });

  return (
    <fieldset className={cardStyles.arrayGroup} data-field={dataField}>
      <legend className={formStyles.label}>{spec.label}</legend>
      <ul className={cardStyles.arrayList}>
        {items.map((item, index) => {
          const name = `${spec.itemLabel} ${index + 1}`;
          return (
            <li key={index} className={cardStyles.arrayItem}>
              <div className={cardStyles.arrayItemHeader}>
                <strong>{name}</strong>
                <div className={styles.btnGroup}>
                  <button
                    type="button"
                    className={secondary}
                    aria-label={`Đưa ${name} lên`}
                    disabled={index === 0}
                    onClick={() => onChange(moveItem(items, index, index - 1))}
                  >
                    {COPY.moveUp}
                  </button>
                  <button
                    type="button"
                    className={secondary}
                    aria-label={`Đưa ${name} xuống`}
                    disabled={index === items.length - 1}
                    onClick={() => onChange(moveItem(items, index, index + 1))}
                  >
                    {COPY.moveDown}
                  </button>
                  <button
                    type="button"
                    className={secondary}
                    aria-label={`Xoá ${name}`}
                    disabled={atMin}
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    {COPY.remove}
                  </button>
                </div>
              </div>
              {renderItem(item, index, (next) => replaceAt(index, next))}
            </li>
          );
        })}
      </ul>
      <FieldError id={`${id}-error`} message={error} />
      {spec.createFromImage ? (
        <MediaDropzone
          id={`${id}-upload`}
          kind="model"
          label={`Thêm ${spec.itemLabel.toLowerCase()}`}
          hint="Kéo ảnh vào đây hoặc bấm để chọn. Mỗi ảnh là một mục mới."
          multiple
          disabled={full}
          onUploaded={(media: MediaUploadResponse) =>
            onChange([...latestItems.current, spec.createFromImage?.({ ...media }) ?? {}].slice(0, spec.max))
          }
        />
      ) : (
        <div className={styles.btnGroup}>
          <button
            type="button"
            className={secondary}
            disabled={full}
            aria-describedby={hintId}
            onClick={() => onChange([...items, spec.create?.() ?? {}])}
          >
            {`+ Thêm ${spec.itemLabel.toLowerCase()}`}
          </button>
        </div>
      )}
      <span id={hintId} className={styles.hint}>
        {full ? `Đã đủ tối đa ${spec.max} mục` : `Tối đa ${spec.max} mục`}
        {atMin ? `. Cần giữ ít nhất ${spec.min} mục` : ''}
      </span>
    </fieldset>
  );
}
