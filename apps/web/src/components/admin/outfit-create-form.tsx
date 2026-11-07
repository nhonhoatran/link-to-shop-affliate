'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  API_PATHS,
  outfitInputSchema,
  slugifyVietnamese,
  type ImageWithUrl,
  type OutfitResponse,
} from '@under30ss/shared';
import { useFormSubmit } from '@/hooks/admin/use-form-submit';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import { apiFetch } from '@/lib/api-client-browser';
import styles from './admin.module.css';
import formStyles from './admin-form.module.css';
import { AdminFormField } from './admin-form-field';
import { FormError } from './field-error';
import { MediaDropzone } from './media-dropzone';
import { MediaThumb } from './media-thumb';

export function OutfitCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [modelImage, setModelImage] = useState<ImageWithUrl | undefined>();
  const { pending, formError, fieldErrors, handle } = useFormSubmit();

  const onSubmit = handle(
    outfitInputSchema,
    () => {
      const ref = modelImage && { key: modelImage.key, width: modelImage.width, height: modelImage.height };
      return { slug, title, modelImage: ref, status: 'draft', featured: false, items: [] };
    },
    async (data) => {
      const created = await apiFetch<OutfitResponse>(API_PATHS.admin.outfits, { method: 'POST', json: data });
      router.push(ADMIN_PATHS.outfitEdit(created.id));
    },
  );

  return (
    <form onSubmit={onSubmit} noValidate className={styles.panel}>
      <FormError message={formError} />
      <AdminFormField id="create-title" label="Tên outfit" error={fieldErrors.title}>
        {(control) => (
          <input
            {...control}
            value={title}
            maxLength={120}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugEdited) setSlug(slugifyVietnamese(event.target.value));
            }}
          />
        )}
      </AdminFormField>
      <AdminFormField
        id="create-slug"
        label="Đường dẫn (slug)"
        hint="Tự tạo từ tên, có thể sửa"
        error={fieldErrors.slug}
      >
        {(control) => (
          <input
            {...control}
            value={slug}
            maxLength={80}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugEdited(true);
            }}
          />
        )}
      </AdminFormField>
      <MediaDropzone
        id="create-model-image"
        kind="model"
        label="Ảnh người mẫu"
        error={fieldErrors.modelImage}
        onUploaded={(media) => setModelImage(media)}
      />
      {modelImage ? <MediaThumb image={modelImage} alt="Ảnh người mẫu đã tải lên" /> : null}
      <div className={formStyles.formActions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={pending}>
          {pending ? 'Đang tạo…' : 'Tạo outfit'}
        </button>
      </div>
    </form>
  );
}
