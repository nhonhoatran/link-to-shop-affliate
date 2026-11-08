import { DEFAULT_PRIVACY_LABEL, MAX_NEWSLETTER_CONSENT_TEXT, MAX_PRIVACY_LABEL_LENGTH } from '@under30ss/shared';
import { AdminFormField } from '../admin-form-field';
import adminStyles from '../admin.module.css';
import formStyles from '../admin-form.module.css';
import styles from './settings-repeatable-list.module.css';
import type { FieldErrors } from '../validation-messages';
import { SettingsCheckboxField } from './settings-checkbox-field';
import type { NewsletterConsentValues } from './settings-form-state';

interface SettingsNewsletterConsentFieldsProps {
  values: NewsletterConsentValues;
  /** Null until a consent sentence has been saved. */
  version: number | null;
  errors: FieldErrors;
  onChange: (patch: Partial<NewsletterConsentValues>) => void;
}

export function SettingsNewsletterConsentFields({ values, version, errors, onChange }: SettingsNewsletterConsentFieldsProps) {
  const remaining = MAX_NEWSLETTER_CONSENT_TEXT - values.text.length;
  return (
    <>
      <SettingsCheckboxField
        id="settings-newsletter-enabled"
        label="Hiện form đăng ký trên trang chủ"
        hint="Tắt thì form ẩn khỏi trang chủ sau khi lưu. Người đã đăng ký vẫn được giữ."
        checked={values.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      <fieldset disabled={!values.enabled} className={values.enabled ? formStyles.plainGroup : `${formStyles.plainGroup} ${styles.dimmed}`}>
      <AdminFormField
        id="settings-newsletter-text"
        label="Câu đồng ý"
        hint={`Hiện cạnh ô chọn trong form đăng ký. Còn ${remaining} ký tự`}
        error={errors['newsletterConsent.text']}
      >
        {(control) => (
          <textarea
            {...control}
            rows={3}
            value={values.text}
            maxLength={MAX_NEWSLETTER_CONSENT_TEXT}
            onChange={(e) => onChange({ text: e.target.value })}
          />
        )}
      </AdminFormField>
      <AdminFormField
        id="settings-newsletter-privacy-href"
        label="Link chính sách (tuỳ chọn)"
        hint="Đường dẫn trong site như /chinh-sach hoặc link https://..."
        error={errors['newsletterConsent.privacyHref']}
      >
        {(control) => (
          <input
            {...control}
            inputMode="url"
            autoCapitalize="none"
            value={values.privacyHref}
            onChange={(e) => onChange({ privacyHref: e.target.value })}
          />
        )}
      </AdminFormField>
      <AdminFormField
        id="settings-newsletter-privacy-label"
        label="Chữ trên link chính sách (tuỳ chọn)"
        hint={`Để trống để dùng "${DEFAULT_PRIVACY_LABEL}"`}
        error={errors['newsletterConsent.privacyLabel']}
      >
        {(control) => (
          <input
            {...control}
            maxLength={MAX_PRIVACY_LABEL_LENGTH}
            placeholder={DEFAULT_PRIVACY_LABEL}
            value={values.privacyLabel}
            onChange={(e) => onChange({ privacyLabel: e.target.value })}
          />
        )}
      </AdminFormField>
      </fieldset>
      {version === null ? (
        <p className={adminStyles.hint}>Chưa lưu: form đăng ký chưa hiện trên trang chủ cho tới khi bật và lưu.</p>
      ) : (
        <p className={adminStyles.hint}>Phiên bản hiện tại: {version}. Tự tăng khi đổi nội dung hoặc link.</p>
      )}
    </>
  );
}
