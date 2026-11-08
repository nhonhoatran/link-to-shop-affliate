'use client';

import { HOME_SECTION_META, HOME_SECTION_TYPES, type HomeSectionType } from '@under30ss/shared';
import type { useModalDialog } from '@/hooks/use-modal-dialog';
import styles from '../admin.module.css';
import formStyles from '../admin-form.module.css';
import { HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import css from './home-editor.module.css';

interface AddSectionDialogProps {
  dialog: ReturnType<typeof useModalDialog>;
  onPick: (type: HomeSectionType) => void;
}

/** One tap on a type adds it and closes the dialog. */
export function AddSectionDialog({ dialog, onPick }: AddSectionDialogProps) {
  const { dialogRef, openerRef, close, onDialogClose, onDialogClick } = dialog;
  return (
    <dialog
      ref={dialogRef}
      className={`${formStyles.dialog} ${css.pickerDialog}`}
      aria-labelledby="add-section-title"
      onClose={onDialogClose}
      onClick={onDialogClick}
    >
      <h2 id="add-section-title" className={styles.panelTitle}>
        {COPY.addDialogTitle}
      </h2>
      <ul className={css.typeList}>
        {HOME_SECTION_TYPES.map((type) => (
          <li key={type}>
            <button
              type="button"
              className={css.typeButton}
              onClick={() => {
                // The new card takes focus; without this the dialog would hand it back to the "add" button.
                openerRef.current = null;
                onPick(type);
                close();
              }}
            >
              <span className={css.typeName}>{HOME_SECTION_META[type].label}</span>
              <span className={styles.hint}>{HOME_SECTION_META[type].description}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={formStyles.dialogActions}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={close}>
          {COPY.addDialogClose}
        </button>
      </div>
    </dialog>
  );
}
