'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminOutfitDto } from '@under30ss/shared';
import { newItemId } from '@/hooks/admin/editor-state';
import { useOutfitActions } from '@/hooks/admin/use-outfit-actions';
import { useElementHeightVar } from '@/hooks/admin/use-element-height-var';
import { useOutfitEditorState } from '@/hooks/admin/use-outfit-editor-state';
import { useSaveShortcut } from '@/hooks/admin/use-save-shortcut';
import { useUnsavedChangesGuard } from '@/hooks/admin/use-unsaved-changes-guard';
import { useWideEditorLayout } from '@/hooks/admin/use-wide-editor-layout';
import { ADMIN_PATHS } from '@/lib/admin-paths';
import editorStyles from './admin-editor.module.css';
import { AdminPanel } from './admin-panel';
import { AnchorPlacementCanvas } from './anchor-placement-canvas';
import { ConfirmDialog } from './confirm-dialog';
import { EditorTabs, type EditorTabPanel } from './editor-tabs';
import { FormError } from './field-error';
import { ItemEditForm } from './item-edit-form';
import { ItemListPanel } from './item-list-panel';
import { mapErrorsToEditorTabs, firstTabWithError, type EditorTabId } from './map-errors-to-editor-tabs';
import { LivePreviewPanel } from './live-preview-panel';
import { MediaDropzone } from './media-dropzone';
import { OutfitDetailsForm } from './outfit-details-form';
import { OutfitEditorToolbar } from './outfit-editor-toolbar';
import { scopeErrors } from './validation-messages';

export function OutfitEditor({ initial }: { initial: AdminOutfitDto }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  useElementHeightVar(rootRef, '[data-editor-actions]', '--editor-actions-height');
  const { state, dispatch, dirty } = useOutfitEditorState(initial);
  const actions = useOutfitActions(state, dispatch);
  useSaveShortcut(() => void actions.save());
  const guard = useUnsavedChangesGuard(dirty, (href) => router.push(href));

  const selectedIndex = state.items.findIndex((item) => item.id === state.selectedId);
  const selected = state.items[selectedIndex];

  const onDelete = async () => {
    if (await actions.remove()) router.replace(ADMIN_PATHS.outfits);
  };

  const errorTabs = useMemo(() => mapErrorsToEditorTabs(actions.errors), [actions.errors]);
  const [activeTab, setActiveTab] = useState<EditorTabId>('info');
  const [focusRequest, setFocusRequest] = useState(0);
  const panelsRef = useRef<HTMLDivElement>(null);
  const wide = useWideEditorLayout();

  useEffect(() => {
    const target = firstTabWithError(errorTabs);
    if (!target) return;
    setActiveTab(target);
    setFocusRequest((count) => count + 1);
  }, [errorTabs]);

  // Runs after the tab switch has rendered, so the invalid field is no longer inside a hidden panel.
  useEffect(() => {
    if (focusRequest === 0) return;
    panelsRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  const panels: EditorTabPanel<EditorTabId>[] = [
    {
      id: 'info',
      label: 'Thông tin',
      className: editorStyles.paneInfo,
      content: <OutfitDetailsForm state={state} errors={actions.errors} dispatch={dispatch} />,
    },
    {
      id: 'items',
      label: 'Món đồ',
      className: editorStyles.paneItems,
      content: (
        <div className={editorStyles.pane}>
          <AdminPanel id="editor-items" title="Món trong outfit">
            <ItemListPanel
              items={state.items}
              selectedId={state.selectedId}
              errors={actions.errors}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onMove={(id, side, index) => dispatch({ type: 'moveItem', id, side, index })}
            />
            <MediaDropzone
              id="editor-add-item"
              kind="item"
              label="Thêm món"
              multiple
              onUploaded={(image) => dispatch({ type: 'addItem', id: newItemId(), image })}
            />
          </AdminPanel>
          {selected ? (
            <ItemEditForm
              key={selected.id}
              item={selected}
              errors={scopeErrors(actions.errors, `items.${selectedIndex}.`)}
              onChange={(patch) => dispatch({ type: 'updateItem', id: selected.id, patch })}
              onDelete={() => dispatch({ type: 'removeItem', id: selected.id })}
            />
          ) : null}
          <AdminPanel id="editor-canvas" title="Đặt điểm trên người mẫu">
            <AnchorPlacementCanvas
              modelImage={state.modelImage}
              items={state.items}
              selectedId={state.selectedId}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onAnchor={(id, anchor) => dispatch({ type: 'setAnchor', id, anchor })}
            />
          </AdminPanel>
        </div>
      ),
    },
    {
      id: 'preview',
      label: 'Xem trước',
      className: editorStyles.panePreview,
      content: <LivePreviewPanel state={state} />,
    },
  ];

  return (
    <div ref={rootRef} className={editorStyles.root}>
      <OutfitEditorToolbar
        state={state}
        dirty={dirty}
        saveStatus={actions.saveStatus}
        removing={actions.removing}
        onSave={() => void actions.save()}
        onToggleStatus={() => void actions.save(state.status === 'published' ? 'draft' : 'published')}
        onToggleFeatured={() => void actions.setFeatured(!state.featured)}
        onDelete={() => void onDelete()}
      />
      <FormError message={actions.message} />
      <div ref={panelsRef}>
        <EditorTabs
          label="Các phần của outfit"
          panels={panels}
          active={activeTab}
          onActiveChange={setActiveTab}
          errorTabs={errorTabs}
          wide={wide}
          panelsClassName={editorStyles.panels}
        />
      </div>
      <ConfirmDialog
        open={guard.pendingHref !== null}
        title="Rời trang khi chưa lưu?"
        message="Các thay đổi chưa lưu sẽ mất."
        confirmLabel="Rời trang"
        cancelLabel="Ở lại"
        danger
        onCancel={guard.cancelLeave}
        onConfirm={guard.confirmLeave}
      />
    </div>
  );
}
