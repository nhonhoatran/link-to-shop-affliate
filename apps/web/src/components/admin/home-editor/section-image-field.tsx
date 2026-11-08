'use client';

import type { MediaUploadResponse } from '@under30ss/shared';
import styles from '../admin.module.css';
import { MediaDropzone } from '../media-dropzone';
import { MediaThumb } from '../media-thumb';

interface SectionImageFieldProps {
  id: string;
  dataField: string;
  label: string;
  /** Stored image; `url` is present when the API attached it. */
  value: { url?: string } | undefined;
  optional: boolean;
  error: string | undefined;
  onChange: (image: MediaUploadResponse | undefined) => void;
}

export function SectionImageField({ id, dataField, label, value, optional, error, onChange }: SectionImageFieldProps) {
  return (
    <div data-field={dataField}>
      <MediaDropzone id={id} kind="model" label={label} error={error} onUploaded={onChange} />
      {value?.url ? <MediaThumb image={{ ...(value as MediaUploadResponse), url: value.url }} /> : null}
      {value && optional ? (
        <div className={styles.btnGroup}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => onChange(undefined)}>
            Bỏ ảnh
          </button>
        </div>
      ) : null}
    </div>
  );
}
