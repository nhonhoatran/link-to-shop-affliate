import { AdminFormField } from './admin-form-field';
import type { FieldErrors } from './validation-messages';

const DEFAULT_HINT = 'Để trống để dùng giá trị mặc định của hệ thống';

export interface ListingFieldValues {
  looksPageSize: string;
  relatedOutfitsCount: string;
}

interface SettingsListingFieldsProps {
  values: ListingFieldValues;
  errors: FieldErrors;
  onChange: (name: keyof ListingFieldValues, value: string) => void;
}

export function SettingsListingFields({ values, errors, onChange }: SettingsListingFieldsProps) {
  return (
    <>
      <AdminFormField
        id="settings-looks-page-size"
        label="Số outfit mỗi trang (trang Tất cả outfit)"
        hint={DEFAULT_HINT}
        error={errors.looksPageSize}
      >
        {(control) => (
          <input
            {...control}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={values.looksPageSize}
            onChange={(e) => onChange('looksPageSize', e.target.value)}
          />
        )}
      </AdminFormField>
      <AdminFormField
        id="settings-related-outfits-count"
        label="Số outfit trong mục Outfit khác"
        hint={DEFAULT_HINT}
        error={errors.relatedOutfitsCount}
      >
        {(control) => (
          <input
            {...control}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={values.relatedOutfitsCount}
            onChange={(e) => onChange('relatedOutfitsCount', e.target.value)}
          />
        )}
      </AdminFormField>
    </>
  );
}
