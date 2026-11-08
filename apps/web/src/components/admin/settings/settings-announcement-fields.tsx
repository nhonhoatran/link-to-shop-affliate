import { MAX_ANNOUNCEMENT_TEXT } from '@under30ss/shared';
import { SiteAnnouncementBar } from '@/components/public/site-announcement-bar';
import { AdminFormField } from '../admin-form-field';
import adminStyles from '../admin.module.css';
import type { FieldErrors } from '../validation-messages';
import { SettingsCheckboxField } from './settings-checkbox-field';
import type { AnnouncementValues } from './settings-form-state';
import styles from './settings-repeatable-list.module.css';

interface SettingsAnnouncementFieldsProps {
  values: AnnouncementValues;
  errors: FieldErrors;
  onChange: (patch: Partial<AnnouncementValues>) => void;
}

export function SettingsAnnouncementFields({ values, errors, onChange }: SettingsAnnouncementFieldsProps) {
  const text = values.text.trim();
  const hasErrors = Object.keys(errors).some((key) => key.startsWith('announcement.'));
  const dimmed = !values.enabled && !hasErrors;
  const remaining = MAX_ANNOUNCEMENT_TEXT - values.text.length;
  return (
    <>
      <SettingsCheckboxField
        id="settings-announcement-enabled"
        label="Hiện dải thông báo trên đầu trang"
        checked={values.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      <div className={dimmed ? styles.dimmed : undefined}>
        <AdminFormField
          id="settings-announcement-text"
          label="Nội dung"
          hint={`Còn ${remaining} ký tự`}
          error={errors['announcement.text']}
        >
          {(control) => (
            <input
              {...control}
              value={values.text}
              maxLength={MAX_ANNOUNCEMENT_TEXT}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          )}
        </AdminFormField>
        <AdminFormField
          id="settings-announcement-link-label"
          label="Chữ trên link (tuỳ chọn)"
          error={errors['announcement.linkLabel']}
        >
          {(control) => (
            <input {...control} value={values.linkLabel} onChange={(e) => onChange({ linkLabel: e.target.value })} />
          )}
        </AdminFormField>
        <AdminFormField
          id="settings-announcement-href"
          label="Đường dẫn (tuỳ chọn)"
          hint="Đường dẫn trong site như /collections hoặc link https://..."
          error={errors['announcement.href']}
        >
          {(control) => (
            <input
              {...control}
              inputMode="url"
              autoCapitalize="none"
              value={values.href}
              onChange={(e) => onChange({ href: e.target.value })}
            />
          )}
        </AdminFormField>
      </div>
      {text ? (
        <div>
          <p className={adminStyles.hint}>Xem trước</p>
          <div className={`${styles.preview} ${dimmed ? styles.dimmed : ''}`}>
            <SiteAnnouncementBar
              announcement={{
                text,
                ...(values.linkLabel.trim() ? { linkLabel: values.linkLabel.trim() } : {}),
                ...(values.href.trim() ? { href: values.href.trim() } : {}),
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
