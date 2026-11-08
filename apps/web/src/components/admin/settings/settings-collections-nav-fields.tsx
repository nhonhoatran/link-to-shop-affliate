import { DEFAULT_COLLECTIONS_LABEL } from '@under30ss/shared';
import { AdminFormField } from '../admin-form-field';
import type { FieldErrors } from '../validation-messages';
import { SettingsCheckboxField } from './settings-checkbox-field';

interface SettingsCollectionsNavFieldsProps {
  enabled: boolean;
  label: string;
  errors: FieldErrors;
  onEnabledChange: (enabled: boolean) => void;
  onLabelChange: (label: string) => void;
}

export function SettingsCollectionsNavFields({
  enabled,
  label,
  errors,
  onEnabledChange,
  onLabelChange,
}: SettingsCollectionsNavFieldsProps) {
  return (
    <>
      <SettingsCheckboxField
        id="settings-collections-nav-enabled"
        label="Hiện link Bộ sưu tập trên menu"
        hint="Link tự ẩn khi chưa có bộ sưu tập nào được đăng"
        checked={enabled}
        onChange={onEnabledChange}
      />
      <AdminFormField
        id="settings-collections-label"
        label="Tên hiển thị"
        hint="Để trống để dùng giá trị mặc định"
        error={errors.collectionsLabel}
      >
        {(control) => (
          <input
            {...control}
            value={label}
            maxLength={40}
            placeholder={DEFAULT_COLLECTIONS_LABEL}
            onChange={(e) => onLabelChange(e.target.value)}
          />
        )}
      </AdminFormField>
    </>
  );
}
