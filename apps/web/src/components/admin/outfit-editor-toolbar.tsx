'use client';

import { useState } from 'react';
import { outfitPath } from '@/lib/seo/absolute-url';
import type { EditorState } from '@/hooks/admin/editor-state';
import type { SaveStatus } from '@/hooks/admin/use-outfit-actions';
import styles from './admin.module.css';
import editorStyles from './admin-editor.module.css';
import { ConfirmDialog } from './confirm-dialog';
import { SaveStatusText } from './save-status-text';

interface OutfitEditorToolbarProps {
  state: EditorState;
  dirty: boolean;
  saveStatus: SaveStatus;
  removing: boolean;
  onSave: () => void;
  onToggleStatus: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

const FEATURED_HINT_ID = 'outfit-featured-hint';

export function OutfitEditorToolbar(props: OutfitEditorToolbarProps) {
  const { state, dirty, saveStatus, removing } = props;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = saveStatus === 'saving' || removing;
  const published = state.status === 'published';
  // Only a published outfit can be featured; an already-featured one can always be un-featured.
  const featuredBlocked = !published && !state.featured;
  const secondary = `${styles.btn} ${styles.btnSecondary}`;

  return (
    <>
      <div className={styles.toolbar}>
        <h1 className={`${styles.title} ${editorStyles.heading}`}>{state.title || 'Outfit chưa có tên'}</h1>
      </div>
      <div className={`${styles.btnGroup} ${editorStyles.actionsBar}`} data-editor-actions>
        <SaveStatusText status={saveStatus} dirty={dirty} />
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={props.onSave}>
          Lưu
        </button>
        <button type="button" className={secondary} disabled={busy} onClick={props.onToggleStatus}>
          {published ? 'Ẩn' : 'Đăng'}
        </button>
        <button
          type="button"
          className={`${secondary} ${styles.btnToggle}`}
          disabled={busy || featuredBlocked}
          aria-pressed={state.featured}
          aria-describedby={featuredBlocked ? FEATURED_HINT_ID : undefined}
          onClick={props.onToggleFeatured}
        >
          {state.featured ? 'Bỏ nổi bật' : 'Đặt nổi bật'}
        </button>
        {featuredBlocked ? (
          <span id={FEATURED_HINT_ID} className={styles.hint}>
            Đăng outfit trước khi đặt nổi bật
          </span>
        ) : null}
        {published ? (
          <a className={secondary} href={outfitPath(state.slug)} target="_blank" rel="noopener noreferrer">
            Xem trang
          </a>
        ) : null}
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDanger}`}
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
        >
          {removing ? 'Đang xoá…' : 'Xoá outfit'}
        </button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title="Xoá outfit này?"
        message="Outfit và toàn bộ món trong đó sẽ bị xoá, không khôi phục được."
        confirmLabel="Xoá outfit"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          props.onDelete();
        }}
      />
    </>
  );
}
