import { MAX_FOOTER_LINKS_PER_COLUMN } from '@under30ss/shared';
import { AdminFormField } from '../admin-form-field';
import adminStyles from '../admin.module.css';
import type { FieldErrors } from '../validation-messages';
import { emptyLink, type FooterColumnRow } from './settings-form-state';
import { SettingsLinkRow } from './settings-link-row';
import styles from './settings-repeatable-list.module.css';

interface SettingsFooterColumnCardProps {
  index: number;
  total: number;
  column: FooterColumnRow;
  errors: FieldErrors;
  onChange: (column: FooterColumnRow) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

export function SettingsFooterColumnCard({
  index,
  total,
  column,
  errors,
  onChange,
  onMove,
  onRemove,
}: SettingsFooterColumnCardProps) {
  const name = column.title.trim() || `${index + 1}`;
  const linksFull = column.links.length >= MAX_FOOTER_LINKS_PER_COLUMN;
  const button = `${adminStyles.btn} ${adminStyles.btnSecondary}`;
  return (
    <section className={styles.group} aria-label={`Cột ${index + 1}`}>
      <div className={styles.groupHeader}>
        <h4 className={styles.groupTitle}>Cột {index + 1}</h4>
        <div className={styles.rowActions}>
          <button type="button" className={button} disabled={index === 0} aria-label={`Chuyển cột ${name} lên`} onClick={() => onMove(-1)}>
            Lên
          </button>
          <button type="button" className={button} disabled={index === total - 1} aria-label={`Chuyển cột ${name} xuống`} onClick={() => onMove(1)}>
            Xuống
          </button>
          <button type="button" className={button} aria-label={`Xoá cột ${name}`} onClick={onRemove}>
            Xoá cột
          </button>
        </div>
      </div>
      <AdminFormField id={`settings-footer-col-${index}-title`} label="Tiêu đề cột" error={errors[`footer.columns.${index}.title`]}>
        {(control) => (
          <input {...control} value={column.title} onChange={(e) => onChange({ ...column, title: e.target.value })} />
        )}
      </AdminFormField>
      {column.links.map((row, linkIndex) => {
        const path = `footer.columns.${index}.links.${linkIndex}`;
        return (
          <SettingsLinkRow
            key={row.key}
            idPrefix={`settings-footer-col-${index}-link-${linkIndex}`}
            row={row}
            labelText="Chữ hiển thị"
            hrefText="Đường dẫn"
            hrefPlaceholder="/looks hoặc https://"
            labelError={errors[`${path}.label`]}
            hrefError={errors[`${path}.href`]}
            removeLabel={`Xoá link ${row.label || linkIndex + 1} trong cột ${name}`}
            onChange={(patch) =>
              onChange({ ...column, links: column.links.map((item, i) => (i === linkIndex ? { ...item, ...patch } : item)) })
            }
            onRemove={() => onChange({ ...column, links: column.links.filter((_, i) => i !== linkIndex) })}
          />
        );
      })}
      <div className={adminStyles.btnGroup}>
        <button
          type="button"
          className={button}
          disabled={linksFull}
          aria-label={`Thêm link vào cột ${name}`}
          onClick={() => onChange({ ...column, links: [...column.links, emptyLink()] })}
        >
          Thêm link
        </button>
        {linksFull ? <p className={adminStyles.hint}>Tối đa {MAX_FOOTER_LINKS_PER_COLUMN} link mỗi cột</p> : null}
      </div>
    </section>
  );
}
