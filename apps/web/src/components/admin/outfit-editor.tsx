'use client';

import { useRouter } from 'next/navigation';
import type { AdminOutfitDto } from '@under30ss/shared';
import { newItemId } from '@/hooks/admin/editor-state';
import { useOutfitActions } from '@/hooks/admin/use-outfit-actions';
import { useOutfitEditorState } from '@/hooks/admin/use-outfit-editor-state';
import { useSaveShortcut } from '@/hooks/admin/use-save-shortcut';
import { useUnsavedChangesGuard } from '@/hooks/admin/use-unsaved-changes-guard';
import editorStyles from './admin-editor.module.css';
import { AdminPanel } from './admin-panel';
import { AnchorPlacementCanvas } from './anchor-placement-canvas';
import { ConfirmDialog } from './confirm-dialog';
import { FormError } from './field-error';
import { ItemEditForm } from './item-edit-form';
import { ItemListPanel } from './item-list-panel';
import { LivePreviewPanel } from './live-preview-panel';
import { MediaDropzone } from './media-dropzone';
import { OutfitDetailsForm } from './outfit-details-form';
import { OutfitEditorToolbar } from './outfit-editor-toolbar';
import { scopeErrors } from './validation-messages';

export function OutfitEditor({ initial }: { initial: AdminOutfitDto }) {
  const router = useRouter();
  const { state, dispatch, dirty } = useOutfitEditorState(initial);
  const actions = useOutfitActions(state, dispatch);
  useSaveShortcut(() => void actions.save());
  const guard = useUnsavedChangesGuard(dirty, (href) => router.push(href));

  const selectedIndex = state.items.findIndex((item) => item.id === state.selectedId);
  const selected = state.items[selectedIndex];

  const onDelete = async () => {
    if (await actions.remove()) router.replace('/admin');
  };

  return (
    <div>
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
      <div className={editorStyles.layout}>
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
        </div>
        <div className={editorStyles.pane}>
          <AdminPanel id="editor-canvas" title="Đặt điểm trên người mẫu">
            <AnchorPlacementCanvas
              modelImage={state.modelImage}
              items={state.items}
              selectedId={state.selectedId}
              onSelect={(id) => dispatch({ type: 'select', id })}
              onAnchor={(id, anchor) => dispatch({ type: 'setAnchor', id, anchor })}
            />
          </AdminPanel>
          <OutfitDetailsForm state={state} errors={actions.errors} dispatch={dispatch} />
        </div>
        <div className={editorStyles.pane}>
          <LivePreviewPanel state={state} />
        </div>
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
