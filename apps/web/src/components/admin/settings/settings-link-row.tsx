import { AdminFormField } from '../admin-form-field';
import adminStyles from '../admin.module.css';
import type { LinkRow } from './settings-form-state';
import styles from './settings-repeatable-list.module.css';

interface SettingsLinkRowProps {
  /** Stable per position, so zod error paths map onto the same inputs. */
  idPrefix: string;
  row: LinkRow;
  labelText: string;
  hrefText: string;
  hrefPlaceholder?: string;
  labelError: string | undefined;
  hrefError: string | undefined;
  removeLabel: string;
  onChange: (patch: Partial<Pick<LinkRow, 'label' | 'href'>>) => void;
  onRemove: () => void;
}

export function SettingsLinkRow({
  idPrefix,
  row,
  labelText,
  hrefText,
  hrefPlaceholder,
  labelError,
  hrefError,
  removeLabel,
  onChange,
  onRemove,
}: SettingsLinkRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.rowFields}>
        <AdminFormField id={`${idPrefix}-label`} label={labelText} error={labelError}>
          {(control) => <input {...control} value={row.label} onChange={(e) => onChange({ label: e.target.value })} />}
        </AdminFormField>
        <AdminFormField id={`${idPrefix}-href`} label={hrefText} error={hrefError}>
          {(control) => (
            <input
              {...control}
              inputMode="url"
              autoCapitalize="none"
              placeholder={hrefPlaceholder}
              value={row.href}
              onChange={(e) => onChange({ href: e.target.value })}
            />
          )}
        </AdminFormField>
      </div>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={`${adminStyles.btn} ${adminStyles.btnSecondary}`}
          aria-label={removeLabel}
          onClick={onRemove}
        >
          Xoá
        </button>
      </div>
    </div>
  );
}
