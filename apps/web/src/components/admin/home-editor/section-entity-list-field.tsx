'use client';

import { useState } from 'react';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import styles from '../admin.module.css';
import formStyles from '../admin-form.module.css';
import { FieldError, FormError } from '../field-error';
import { CollectionPicker } from '../pickers/collection-picker';
import { OutfitPicker } from '../pickers/outfit-picker';
import type { PickerItem } from '../pickers/use-entity-search';
import { HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import css from './home-editor.module.css';
import { moveItem } from './move-section';
import { useEntityLabels, type EntityKind } from './use-entity-labels';

interface SectionEntityListFieldProps {
  id: string;
  dataField: string;
  label: string;
  hint?: string | undefined;
  kind: EntityKind;
  ids: readonly string[];
  max: number;
  error: string | undefined;
  onChange: (ids: string[]) => void;
}

const secondary = `${styles.btn} ${styles.btnSecondary}`;
const NOUN: Record<EntityKind, string> = { outfit: 'outfit', collection: 'bộ sưu tập' };

/** Ordered list of picked outfits or collections: Up/Down/Remove per row, a dialog with the shared picker to add. */
export function SectionEntityListField({ id, dataField, label, hint, kind, ids, max, error, onChange }: SectionEntityListFieldProps) {
  const { labelOf, remember } = useEntityLabels(kind, ids);
  const { dialogRef, openerRef, open, close, onDialogClose, onDialogClick } = useModalDialog();
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<PickerItem[]>([]);
  const single = max === 1;
  const remaining = single ? 1 : max - ids.length;
  const tooMany = picked.length > remaining;
  const noun = NOUN[kind];

  const openPicker = () => {
    setPicked([]);
    setAdding(true);
    open();
  };

  const confirm = () => {
    // The collection picker keeps its own names; only the outfit picker hands labels over.
    if (kind === 'outfit') remember(picked);
    const pickedIds = picked.map((item) => item.id);
    onChange(single ? pickedIds.slice(0, 1) : [...ids, ...pickedIds.filter((pickedId) => !ids.includes(pickedId))]);
    openerRef.current = null;
    close();
  };

  return (
    <fieldset className={css.arrayGroup} data-field={dataField}>
      <legend className={formStyles.label}>{label}</legend>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      {ids.length === 0 ? (
        <p className={styles.hint}>{`Chưa chọn ${noun} nào.`}</p>
      ) : (
        <ul className={css.arrayList}>
          {ids.map((entityId, index) => {
            const name = labelOf(entityId);
            return (
              <li key={entityId} className={css.entityRow}>
                <span className={css.entityName}>{name}</span>
                <div className={styles.btnGroup}>
                  {single ? null : (
                    <>
                      <button type="button" className={secondary} aria-label={`Đưa ${name} lên`} disabled={index === 0} onClick={() => onChange(moveItem(ids, index, index - 1))}>
                        {COPY.moveUp}
                      </button>
                      <button type="button" className={secondary} aria-label={`Đưa ${name} xuống`} disabled={index === ids.length - 1} onClick={() => onChange(moveItem(ids, index, index + 1))}>
                        {COPY.moveDown}
                      </button>
                    </>
                  )}
                  <button type="button" className={secondary} aria-label={`Gỡ ${name}`} onClick={() => onChange(ids.filter((_, i) => i !== index))}>
                    Gỡ
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <FieldError id={`${id}-error`} message={error} />
      <div className={styles.btnGroup}>
        <button type="button" className={secondary} disabled={!single && remaining <= 0} onClick={openPicker}>
          {single ? `${ids.length > 0 ? 'Đổi' : 'Chọn'} ${noun}` : `+ Thêm ${noun}`}
        </button>
        {single ? null : <span className={styles.hint}>{`Tối đa ${max}`}</span>}
      </div>
      <dialog
        ref={dialogRef}
        className={`${formStyles.dialog} ${css.pickerDialog}`}
        aria-label={`Chọn ${noun}`}
        onClose={() => {
          onDialogClose();
          setAdding(false);
        }}
        onClick={onDialogClick}
      >
        {adding ? (
          <>
            {kind === 'outfit' ? (
              <OutfitPicker selected={picked} onChange={setPicked} />
            ) : (
              <CollectionPicker
                id="home-section-collection-picker"
                hint="Chọn bộ sưu tập để thêm vào khối này."
                autoLoad
                value={picked.map((item) => item.id)}
                onChange={(next) => setPicked(next.map((pickedId) => ({ id: pickedId, label: '' })))}
              />
            )}
            <FormError message={tooMany ? `Chỉ chọn thêm được tối đa ${remaining}` : null} />
            <div className={formStyles.dialogActions}>
              <button type="button" className={secondary} onClick={close}>
                Huỷ
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={picked.length === 0 || tooMany} onClick={confirm}>
                Thêm vào danh sách
              </button>
            </div>
          </>
        ) : null}
      </dialog>
    </fieldset>
  );
}
