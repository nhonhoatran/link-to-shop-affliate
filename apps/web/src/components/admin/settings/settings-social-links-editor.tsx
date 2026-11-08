import { MAX_FOOTER_SOCIAL_LINKS } from '@under30ss/shared';
import adminStyles from '../admin.module.css';
import type { FieldErrors } from '../validation-messages';
import { emptyLink, type LinkRow } from './settings-form-state';
import { SettingsLinkRow } from './settings-link-row';

interface SettingsSocialLinksEditorProps {
  rows: LinkRow[];
  errors: FieldErrors;
  onChange: (rows: LinkRow[]) => void;
}

export function SettingsSocialLinksEditor({ rows, errors, onChange }: SettingsSocialLinksEditorProps) {
  const full = rows.length >= MAX_FOOTER_SOCIAL_LINKS;
  return (
    <div>
      <h3 className={adminStyles.panelTitle}>Mạng xã hội</h3>
      {rows.map((row, index) => (
        <SettingsLinkRow
          key={row.key}
          idPrefix={`settings-social-${index}`}
          row={row}
          labelText="Tên"
          hrefText="Link (https://...)"
          hrefPlaceholder="https://"
          labelError={errors[`footer.social.${index}.label`]}
          hrefError={errors[`footer.social.${index}.href`]}
          removeLabel={`Xoá mạng xã hội ${row.label || index + 1}`}
          onChange={(patch) => onChange(rows.map((item, i) => (i === index ? { ...item, ...patch } : item)))}
          onRemove={() => onChange(rows.filter((_, i) => i !== index))}
        />
      ))}
      <div className={adminStyles.btnGroup}>
        <button
          type="button"
          className={`${adminStyles.btn} ${adminStyles.btnSecondary}`}
          disabled={full}
          onClick={() => onChange([...rows, emptyLink()])}
        >
          Thêm mạng xã hội
        </button>
        {full ? <p className={adminStyles.hint}>Tối đa {MAX_FOOTER_SOCIAL_LINKS} mạng xã hội</p> : null}
      </div>
    </div>
  );
}
