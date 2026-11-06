'use client';

import { useState } from 'react';
import type { EditorItem, ItemPatch } from '@/hooks/admin/editor-state';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';
import { AdminFormField } from './admin-form-field';
import { AdminPanel } from './admin-panel';
import { ConfirmDialog } from './confirm-dialog';
import { MediaDropzone } from './media-dropzone';
import { MediaThumb } from './media-thumb';
import type { FieldErrors } from './validation-messages';

interface ItemEditFormProps {
  item: EditorItem;
  /** Errors for this item only, keyed by field name (name, affiliateUrl, anchor, ...). */
  errors: FieldErrors;
  onChange: (patch: ItemPatch) => void;
  onDelete: () => void;
}

export function ItemEditForm({ item, errors, onChange, onDelete }: ItemEditFormProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <AdminPanel id="item-edit" title="Chi tiết món">
      <MediaDropzone
        id="item-image"
        kind="item"
        label="Đổi ảnh món"
        onUploaded={(media) => onChange({ image: media })}
      />
      <MediaThumb image={item.image} alt={item.name} />
      <AdminFormField id="item-name" label="Tên món" error={errors.name}>
        {(control) => (
          <input {...control} value={item.name} maxLength={80} onChange={(e) => onChange({ name: e.target.value })} />
        )}
      </AdminFormField>
      <AdminFormField id="item-subtitle" label="Dòng phụ" error={errors.subtitle}>
        {(control) => (
          <input {...control} value={item.subtitle} maxLength={80} onChange={(e) => onChange({ subtitle: e.target.value })} />
        )}
      </AdminFormField>
      <AdminFormField id="item-description" label="Mô tả" error={errors.description}>
        {(control) => (
          <textarea
            {...control}
            rows={3}
            value={item.description}
            maxLength={240}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        )}
      </AdminFormField>
      <AdminFormField
        id="item-link"
        label="Link affiliate"
        hint="Bắt đầu bằng https://, bắt buộc khi đăng"
        error={errors.affiliateUrl}
      >
        {(control) => (
          <input
            {...control}
            type="url"
            inputMode="url"
            value={item.affiliateUrl}
            onChange={(e) => onChange({ affiliateUrl: e.target.value.trim() })}
          />
        )}
      </AdminFormField>
      <AdminFormField id="item-anchor" label="Điểm trên người mẫu" error={errors.anchor} display>
        {(control) => <output {...control}>{item.anchor ? 'Đã đặt điểm' : 'Chưa đặt điểm'}</output>}
      </AdminFormField>
      <div className={formStyles.formActions}>
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => setConfirmOpen(true)}>
          Xoá món
        </button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Xoá món này?"
        message={`Món "${item.name}" sẽ bị xoá khỏi outfit. Bạn vẫn có thể bỏ thay đổi bằng cách không lưu.`}
        confirmLabel="Xoá món"
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete();
        }}
      />
    </AdminPanel>
  );
}
