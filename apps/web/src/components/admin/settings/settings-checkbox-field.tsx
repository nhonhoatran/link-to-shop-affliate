import styles from './settings-repeatable-list.module.css';
import adminStyles from '../admin.module.css';

interface SettingsCheckboxFieldProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function SettingsCheckboxField({ id, label, hint, checked, onChange }: SettingsCheckboxFieldProps) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className={styles.checkbox}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {hint ? (
        <p id={hintId} className={adminStyles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
