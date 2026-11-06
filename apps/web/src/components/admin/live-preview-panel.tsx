'use client';

import { useMemo, useState } from 'react';
import { LookbookLayout } from '@/components/lookbook';
import type { EditorState } from '@/hooks/admin/editor-state';
import styles from './admin.module.css';
import editorStyles from './admin-editor.module.css';
import { AdminPanel } from './admin-panel';
import { FormError } from './field-error';
import { mapEditorStateToPublicDto } from './map-editor-state-to-public-dto';

type Width = 'desktop' | 'mobile';

export function LivePreviewPanel({ state }: { state: EditorState }) {
  const [width, setWidth] = useState<Width>('desktop');
  const outfit = useMemo(() => mapEditorStateToPublicDto(state), [state]);
  const hidden = state.items.length - outfit.items.length;

  return (
    <AdminPanel
      id="editor-preview"
      title="Xem trước"
      actions={
        <div role="group" aria-label="Kích thước xem trước" className={styles.btnGroup}>
          {(['desktop', 'mobile'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={width === value}
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnToggle}`}
              onClick={() => setWidth(value)}
            >
              {value === 'desktop' ? 'Máy tính' : 'Điện thoại'}
            </button>
          ))}
        </div>
      }
    >
      <FormError
        tone="warning"
        message={hidden > 0 ? `${hidden} món chưa đặt điểm nên chưa hiện trong bản xem trước và trên trang thật` : null}
      />
      <div className={`${editorStyles.previewFrame} ${width === 'mobile' ? editorStyles.previewMobile : ''}`}>
        <LookbookLayout outfit={outfit} headingLevel="h2" />
      </div>
    </AdminPanel>
  );
}
