import { HOME_MODES, type HomeMode } from '@under30ss/shared';
import adminStyles from '../admin.module.css';
import formStyles from '../admin-form.module.css';
import styles from './settings-home-mode-field.module.css';

export const HOME_MODE_LABELS: Record<HomeMode, string> = {
  feed: 'Feed outfit — lướt từng outfit như TikTok',
  sections: 'Các khối tự sắp — theo Trình dựng trang chủ',
};

interface SettingsHomeModeFieldProps {
  value: HomeMode;
  onChange: (value: HomeMode) => void;
}

export function SettingsHomeModeField({ value, onChange }: SettingsHomeModeFieldProps) {
  return (
    <fieldset className={`${formStyles.field} ${styles.group}`}>
      <legend className={formStyles.label}>Trang chủ hiển thị</legend>
      {HOME_MODES.map((mode) => (
        <label key={mode} className={styles.option}>
          <input
            type="radio"
            name="settings-home-mode"
            value={mode}
            checked={value === mode}
            onChange={() => onChange(mode)}
          />
          {HOME_MODE_LABELS[mode]}
        </label>
      ))}
      <span className={adminStyles.hint}>Áp dụng cho trang chủ công khai của site</span>
    </fieldset>
  );
}
