'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { AdminHomeLayoutDto } from '@under30ss/shared';
import { useElementHeightVar } from '@/hooks/admin/use-element-height-var';
import { useSaveShortcut } from '@/hooks/admin/use-save-shortcut';
import { useUnsavedChangesGuard } from '@/hooks/admin/use-unsaved-changes-guard';
import { useWideEditorLayout } from '@/hooks/admin/use-wide-editor-layout';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import styles from '../admin.module.css';
import editorStyles from '../admin-editor.module.css';
import { ConfirmDialog } from '../confirm-dialog';
import { EditorTabs, type EditorTabPanel } from '../editor-tabs';
import { FormError } from '../field-error';
import { HOME_EDITOR_COPY as COPY } from './home-editor-copy';
import { HomeEditorToolbar } from './home-editor-toolbar';
import { HomePreviewPane } from './home-preview-pane';
import { firstErrorSectionId } from './map-layout-errors';
import { SectionListPanel } from './section-list-panel';
import { useHomeLayoutActions } from './use-home-layout-actions';
import { useHomeLayoutState } from './use-home-layout-state';

type TabId = 'edit' | 'preview';

interface HomeEditorScreenProps {
  initial: AdminHomeLayoutDto;
  siteUrl: string;
}

export function HomeEditorScreen({ initial, siteUrl }: HomeEditorScreenProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  useElementHeightVar(rootRef, '[data-editor-actions]', '--editor-actions-height');
  const { state, dispatch, dirty } = useHomeLayoutState(initial);
  const actions = useHomeLayoutActions(state, dispatch);
  useSaveShortcut(() => void actions.saveDraft());
  const guard = useUnsavedChangesGuard(dirty, (href) => router.push(href));
  const wide = useWideEditorLayout();
  const [activeTab, setActiveTab] = useState<TabId>('edit');
  const [focusInvalid, setFocusInvalid] = useState(false);
  const handledRequest = useRef(0);

  // A failed save opens the first section with an error; the focus follows once its form has rendered.
  useEffect(() => {
    if (actions.focusRequest === handledRequest.current) return;
    handledRequest.current = actions.focusRequest;
    const id = firstErrorSectionId(actions.errors, state.content);
    if (!id) return;
    dispatch({ type: 'select', id });
    setActiveTab('edit');
    setFocusInvalid(true);
  }, [actions.focusRequest, actions.errors, state.content, dispatch]);

  useEffect(() => {
    if (!focusInvalid) return;
    setFocusInvalid(false);
    panelsRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusInvalid]);

  // The tab is opened before the (async) save so the browser still counts it as a click.
  const openPreview = async () => {
    const tab = window.open('about:blank', '_blank');
    if (!tab) return;
    tab.opener = null;
    if (!dirty || (await actions.saveDraft())) tab.location.href = ADMIN_PATHS.homePreview;
    else tab.close();
  };

  const panels: EditorTabPanel<TabId>[] = [
    {
      id: 'edit',
      label: COPY.tabEdit,
      className: editorStyles.paneInfo,
      content: <SectionListPanel state={state} dispatch={dispatch} errors={actions.errors} />,
    },
    {
      id: 'preview',
      label: COPY.tabPreview,
      className: editorStyles.panePreview,
      content: (
        <HomePreviewPane
          content={state.content}
          wide={wide}
          siteUrl={siteUrl}
          onSelectSection={(id) => {
            dispatch({ type: 'select', id });
            setActiveTab('edit');
          }}
        />
      ),
    },
  ];

  return (
    <div ref={rootRef} className={editorStyles.root}>
      <HomeEditorToolbar
        saveStatus={actions.saveStatus}
        dirty={dirty}
        hasUnpublishedChanges={state.hasUnpublishedChanges}
        usingDefault={state.usingDefault}
        publishedAt={state.publishedAt}
        busy={actions.busy}
        canRestore={state.previous !== null}
        onSaveDraft={() => void actions.saveDraft()}
        onPublish={() => void actions.publish()}
        onOpenPreview={() => void openPreview()}
        onRestore={() => void actions.restorePrevious()}
        onRevert={() => void actions.revertDraft()}
        onReset={() => void actions.resetToDefault()}
      />
      <FormError message={actions.message} />
      {actions.conflict ? (
        <div className={styles.btnGroup}>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => window.location.reload()}>
            {COPY.reload}
          </button>
        </div>
      ) : null}
      <div ref={panelsRef}>
        <EditorTabs
          label={COPY.tabsLabel}
          panels={panels}
          active={activeTab}
          onActiveChange={setActiveTab}
          errorTabs={new Set<TabId>(Object.keys(actions.errors).length > 0 ? ['edit'] : [])}
          wide={wide}
          panelsClassName={editorStyles.panels}
        />
      </div>
      <ConfirmDialog
        open={guard.pendingHref !== null}
        title={COPY.leaveTitle}
        message={COPY.leaveMessage}
        confirmLabel={COPY.leaveConfirm}
        cancelLabel={COPY.leaveCancel}
        danger
        onCancel={guard.cancelLeave}
        onConfirm={guard.confirmLeave}
      />
    </div>
  );
}
