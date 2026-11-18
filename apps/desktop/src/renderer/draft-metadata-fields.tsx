import { slugifyVietnamese, type DesktopDraft } from '@under30ss/shared';
import { TextAreaField, TextField } from './form-fields';

export function DraftMetadataFields({ draft, onChange }: { draft: DesktopDraft; onChange: (value: DesktopDraft) => void }) {
  return <details className="advanced" open><summary>Thông tin outfit và bộ sưu tập</summary>
    <div className="field-grid"><TextField label="Tiêu đề outfit" value={draft.title} maxLength={120} onChange={(title) => onChange({ ...draft, title })} />
      <TextField label="Slug outfit" value={draft.slug} maxLength={80} onChange={(slug) => onChange({ ...draft, slug })}
        hint="Chữ thường không dấu, số và dấu gạch nối. Đổi slug nếu website báo trùng." /></div>
    <button type="button" onClick={() => onChange({ ...draft, slug: slugifyVietnamese(draft.title) })}>Tạo slug từ tiêu đề</button>
    <TextAreaField label="Mô tả SEO outfit" value={draft.seoDescription} maxLength={300} onChange={(seoDescription) => onChange({ ...draft, seoDescription })} />
    <div className="field-grid"><TextField label="Tên bộ sưu tập" value={draft.collection.name} maxLength={80}
      onChange={(name) => onChange({ ...draft, collection: { ...draft.collection, name } })} />
      <TextField label="Slug bộ sưu tập" value={draft.collection.slug} maxLength={80}
        onChange={(slug) => onChange({ ...draft, collection: { ...draft.collection, slug } })} /></div>
    <button type="button" onClick={() => onChange({ ...draft, collection: { ...draft.collection, slug: slugifyVietnamese(draft.collection.name) } })}>Tạo slug từ tên bộ sưu tập</button>
    <TextAreaField label="Mô tả bộ sưu tập" value={draft.collection.description} maxLength={500}
      onChange={(description) => onChange({ ...draft, collection: { ...draft.collection, description } })} />
    <p className="hint">Ảnh người mẫu sẽ làm ảnh bìa bộ sưu tập. Cả outfit và bộ sưu tập đều được tạo ở trạng thái nháp.</p>
  </details>;
}

