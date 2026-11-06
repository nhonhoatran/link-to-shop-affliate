import type { ReactNode } from 'react';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';
import { FieldError } from './field-error';

export interface FieldControlProps {
  id: string;
  className: string;
  'aria-invalid': true | undefined;
  'aria-describedby': string | undefined;
}

interface AdminFormFieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  /** For fields laid out in a row (filters), where the row owns the spacing. */
  compact?: boolean;
  /** The control only shows a value (e.g. an <output>): no input styling and never aria-invalid. */
  display?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label above the control, hint and error below; the render prop receives the a11y wiring for the control. */
export function AdminFormField({ id, label, error, hint, compact = false, display = false, children }: AdminFormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');
  return (
    <div className={`${formStyles.field} ${compact ? formStyles.fieldCompact : ''}`}>
      <label htmlFor={id} className={formStyles.label}>
        {label}
      </label>
      {children({
        id,
        className: (display ? formStyles.display : formStyles.control) ?? '',
        'aria-invalid': error && !display ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
