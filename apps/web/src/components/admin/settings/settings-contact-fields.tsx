import { AdminFormField } from '../admin-form-field';
import { AdminPanel } from '../admin-panel';
import type { FieldErrors } from '../validation-messages';
import type { SettingsFormState } from './settings-form-state';

type ContactValues = Pick<SettingsFormState, 'contactEmail' | 'contactPhone'>;

interface SettingsContactFieldsProps {
  values: ContactValues;
  errors: FieldErrors;
  onChange: (patch: Partial<ContactValues>) => void;
}

export function SettingsContactFields({ values, errors, onChange }: SettingsContactFieldsProps) {
  return (
    <AdminPanel id="settings-contact" title="Liên hệ">
      <AdminFormField
        id="settings-contact-email"
        label="Email liên hệ"
        hint="Hiện ở chân trang. Để trống để ẩn."
        error={errors.contactEmail}
      >
        {(control) => (
          <input
            {...control}
            type="email"
            autoComplete="email"
            maxLength={254}
            value={values.contactEmail}
            onChange={(e) => onChange({ contactEmail: e.target.value })}
          />
        )}
      </AdminFormField>
      <AdminFormField
        id="settings-contact-phone"
        label="Số điện thoại liên hệ"
        hint="Hiện ở chân trang. Để trống để ẩn."
        error={errors.contactPhone}
      >
        {(control) => (
          <input
            {...control}
            type="tel"
            autoComplete="tel"
            maxLength={40}
            value={values.contactPhone}
            onChange={(e) => onChange({ contactPhone: e.target.value })}
          />
        )}
      </AdminFormField>
    </AdminPanel>
  );
}
