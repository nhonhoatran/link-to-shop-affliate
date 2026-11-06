'use client';

import type { Dispatch } from 'react';
import type { EditorAction, EditorState } from '@/hooks/admin/editor-state';
import { AdminFormField } from './admin-form-field';
import { AdminPanel } from './admin-panel';
import { MediaDropzone } from './media-dropzone';
import type { FieldErrors } from './validation-messages';

interface OutfitDetailsFormProps {
  state: EditorState;
  errors: FieldErrors;
  dispatch: Dispatch<EditorAction>;
}

export function OutfitDetailsForm({ state, errors, dispatch }: OutfitDetailsFormProps) {
  const setField = (field: 'title' | 'slug' | 'seoDescription') => (value: string) =>
    dispatch({ type: 'field', field, value });

  return (
    <AdminPanel id="editor-details" title="Thông tin outfit">
      <AdminFormField id="outfit-title" label="Tên outfit" error={errors.title}>
        {(control) => (
          <input {...control} value={state.title} maxLength={120} onChange={(e) => setField('title')(e.target.value)} />
        )}
      </AdminFormField>
      <AdminFormField
        id="outfit-slug"
        label="Đường dẫn (slug)"
        hint="Đổi slug sẽ đổi địa chỉ trang"
        error={errors.slug}
      >
        {(control) => (
          <input {...control} value={state.slug} maxLength={80} onChange={(e) => setField('slug')(e.target.value)} />
        )}
      </AdminFormField>
      <AdminFormField id="outfit-seo" label="Mô tả SEO" error={errors.seoDescription}>
        {(control) => (
          <textarea
            {...control}
            rows={3}
            value={state.seoDescription}
            maxLength={300}
            onChange={(e) => setField('seoDescription')(e.target.value)}
          />
        )}
      </AdminFormField>
      <MediaDropzone
        id="outfit-model-image"
        kind="model"
        label="Đổi ảnh người mẫu"
        hint="Các điểm đã đặt giữ nguyên vị trí theo phần trăm"
        onUploaded={(image) => dispatch({ type: 'modelImage', image })}
      />
    </AdminPanel>
  );
}
