'use client';

import { useRef, useState, type DragEvent } from 'react';
import type { MediaKind, MediaUploadResponse } from '@under30ss/shared';
import { uploadMedia } from '@/lib/api-client-browser';
import { useRedirectOnUnauthorized } from '@/hooks/admin/use-redirect-on-unauthorized';
import styles from './admin.module.css';
import zoneStyles from './admin-dropzone.module.css';
import { AdminFormField } from './admin-form-field';
import { describeApiFailure } from './describe-api-failure';
import { StatusMessage } from './save-status-text';

interface MediaDropzoneProps {
  id: string;
  kind: MediaKind;
  label: string;
  hint?: string;
  /** Error owned by the parent form (e.g. a missing image); shown instead of an upload error. */
  error?: string | undefined;
  multiple?: boolean;
  disabled?: boolean;
  onUploaded: (media: MediaUploadResponse) => void;
}

/** Drag-drop or click; files upload one by one (fetch has no upload progress, so the state is indeterminate). */
export function MediaDropzone({
  id,
  kind,
  label,
  hint,
  error,
  multiple = false,
  disabled = false,
  onUploaded,
}: MediaDropzoneProps) {
  const redirectOnUnauthorized = useRedirectOnUnauthorized();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | undefined>();

  const upload = async (files: File[]) => {
    setUploadError(undefined);
    for (const file of multiple ? files : files.slice(0, 1)) {
      if (!file.type.startsWith('image/')) {
        setUploadError(`"${file.name}" không phải là ảnh`);
        continue;
      }
      setUploading(file.name);
      try {
        onUploaded(await uploadMedia(file, kind));
      } catch (err) {
        if (redirectOnUnauthorized(err)) break;
        setUploadError(describeApiFailure(err).message);
      }
    }
    setUploading(null);
  };

  const hintId = `${id}-hint`;
  const busy = disabled || uploading !== null;

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (!busy) void upload(Array.from(event.dataTransfer.files));
  };

  return (
    <AdminFormField id={id} label={label} error={error ?? uploadError}>
      {(control) => (
        <>
          <div
            className={`${zoneStyles.dropzone} ${dragging ? zoneStyles.dropzoneActive : ''}`}
            onClick={(event) => {
              if (!(event.target instanceof HTMLInputElement)) inputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {hint ? (
              <span id={hintId} className={styles.hint}>
                {hint}
              </span>
            ) : (
              <span className={styles.hint} aria-hidden="true">
                {multiple ? 'Kéo nhiều ảnh vào đây hoặc bấm để chọn' : 'Kéo ảnh vào đây hoặc bấm để chọn'}
              </span>
            )}
            <input
              {...control}
              aria-describedby={[hint ? hintId : null, control['aria-describedby']].filter(Boolean).join(' ') || undefined}
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple={multiple}
              disabled={busy}
              className={styles.srOnly}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = '';
                void upload(files);
              }}
            />
          </div>
          <StatusMessage>{uploading ? `Đang tải lên ${uploading}…` : ''}</StatusMessage>
        </>
      )}
    </AdminFormField>
  );
}
