'use client';

import { useState, useSyncExternalStore } from 'react';
import type { SaveStatus } from '@/hooks/admin/use-outfit-actions';
import styles from '../admin.module.css';
import editorStyles from '../admin-editor.module.css';
import { ConfirmDialog } from '../confirm-dialog';
import { StatusMessage } from '../save-status-text';
import { HOME_EDITOR_COPY as COPY, publishedAtText } from './home-editor-copy';
import { HomeEditorMoreMenu, type MoreMenuItem } from './home-editor-more-menu';
import css from './home-editor.module.css';

const subscribeNothing = () => () => undefined;
// False while the server renders and during hydration, so the time (which depends on the browser's time zone) never mismatches.
const useHydrated = () => useSyncExternalStore(subscribeNothing, () => true, () => false);

interface StatusInput {
  saveStatus: SaveStatus;
  dirty: boolean;
  hasUnpublishedChanges: boolean;
  usingDefault: boolean;
  publishedAt: string | null;
}

export function homeStatusText(input: StatusInput, hydrated: boolean): string {
  if (input.saveStatus === 'saving') return COPY.statusSaving;
  if (input.saveStatus === 'error') return COPY.statusError;
  if (input.dirty || input.hasUnpublishedChanges) return COPY.statusUnpublished;
  if (input.usingDefault || !input.publishedAt) return COPY.statusDefault;
  const time = hydrated
    ? new Date(input.publishedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
    : '';
  return time ? publishedAtText(time) : 'Đã đăng';
}

interface HomeEditorToolbarProps extends StatusInput {
  busy: boolean;
  canRestore: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onOpenPreview: () => void;
  onRestore: () => void;
  onRevert: () => void;
  onReset: () => void;
}

export function HomeEditorToolbar(props: HomeEditorToolbarProps) {
  const { busy, dirty, hasUnpublishedChanges, canRestore } = props;
  const hydrated = useHydrated();
  const [confirm, setConfirm] = useState<'revert' | 'reset' | null>(null);
  const secondary = `${styles.btn} ${styles.btnSecondary}`;
  const canPublish = dirty || hasUnpublishedChanges;

  const items: MoreMenuItem[] = [
    { key: 'save', label: COPY.saveDraft, onSelect: props.onSaveDraft, disabled: busy, narrowOnly: true },
    { key: 'preview', label: COPY.openPreview, onSelect: props.onOpenPreview, narrowOnly: true },
    { key: 'restore', label: COPY.restorePrevious, onSelect: props.onRestore, disabled: busy || !canRestore },
    { key: 'revert', label: COPY.revertDraft, onSelect: () => setConfirm('revert'), disabled: busy || !canPublish },
    { key: 'reset', label: COPY.resetDefault, onSelect: () => setConfirm('reset'), disabled: busy },
  ];

  return (
    <>
      <div className={styles.toolbar}>
        <h1 className={`${styles.title} ${editorStyles.heading}`}>{COPY.title}</h1>
      </div>
      <div className={`${styles.btnGroup} ${editorStyles.actionsBar}`} data-editor-actions>
        <StatusMessage>{homeStatusText(props, hydrated)}</StatusMessage>
        <button type="button" className={`${secondary} ${css.wideOnly}`} disabled={busy} onClick={props.onSaveDraft}>
          {COPY.saveDraft}
        </button>
        <button type="button" className={`${secondary} ${css.wideOnly}`} onClick={props.onOpenPreview}>
          {COPY.openPreview}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy || !canPublish} onClick={props.onPublish}>
          {COPY.publish}
        </button>
        <HomeEditorMoreMenu items={items} />
      </div>
      <ConfirmDialog
        open={confirm === 'revert'}
        title={COPY.revertTitle}
        message={COPY.revertMessage}
        confirmLabel={COPY.revertConfirm}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          props.onRevert();
        }}
      />
      <ConfirmDialog
        open={confirm === 'reset'}
        title={COPY.resetTitle}
        message={COPY.resetMessage}
        confirmLabel={COPY.resetConfirm}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          props.onReset();
        }}
      />
    </>
  );
}
