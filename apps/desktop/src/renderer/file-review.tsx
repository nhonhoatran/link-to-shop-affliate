import { useEffect, useMemo, useState } from 'react';
import { approvedDesktopDraftSchema, desktopDraftSchema, MAX_ITEMS_PER_OUTFIT, type DesktopBridge, type DesktopDraft, type DesktopFile } from '@under30ss/shared';
import type { DesktopWorkspace } from './use-desktop-workspace';
import { FILE_STATUS_LABELS, remoteLocksFile } from './desktop-types';
import { CropFields } from './crop-fields';
import { CropPreview, SourcePreview } from './crop-preview';
import { DraftMetadataFields } from './draft-metadata-fields';
import { DraftItemEditor } from './draft-item-editor';
import { draftIssueLabel, manualDraft, newDraftItem, normalizeOrders, patchDraftItem } from './draft-helpers';

interface FileReviewProps {
  api: DesktopBridge; sessionId: string; file: DesktopFile; busy: boolean; onSave: DesktopWorkspace['saveDraft'];
  onApprove: DesktopWorkspace['approve']; onAnalyze: () => void; onDirty: (dirty: boolean) => void; onOpenRemote: (kind: 'outfit' | 'collection') => void;
}

export function FileReview(props: FileReviewProps) {
  const { api, sessionId, file, busy, onSave, onApprove, onAnalyze, onDirty, onOpenRemote } = props;
  const baseline = file.draft ?? manualDraft(file);
  const [draft, setDraft] = useState<DesktopDraft>(baseline);
  const [selectedId, setSelectedId] = useState<string | null>(draft.items[0]?.id ?? null);
  const [errors, setErrors] = useState<string[]>([]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const needsSave = dirty || !file.draft;
  const remoteLocked = remoteLocksFile(file);
  const locked = remoteLocked || file.status === 'synced' || file.status === 'syncing' || file.status === 'analyzing';
  const approved = file.approvedRevision === file.revision && !needsSave;
  const blockers = useMemo(() => {
    const result = approvedDesktopDraftSchema.safeParse(draft);
    return result.success ? [] : result.error.issues.map((issue) => draftIssueLabel(issue.path, issue.message));
  }, [draft]);
  const selected = draft.items.find((item) => item.id === selectedId);
  const source = { url: api.assetUrl(sessionId, file.sourceAssetId), width: file.width, height: file.height };

  useEffect(() => {
    onDirty(dirty && !locked);
    return () => onDirty(false);
  }, [dirty, locked, onDirty]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty && !locked) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, locked]);

  const save = async () => {
    const result = desktopDraftSchema.safeParse(draft);
    if (!result.success) { setErrors(result.error.issues.map((issue) => draftIssueLabel(issue.path, issue.message))); return; }
    setErrors([]); await onSave(result.data);
  };
  const add = () => {
    const item = newDraftItem(draft.items);
    setDraft({ ...draft, items: [...draft.items, item] }); setSelectedId(item.id);
  };
  const remove = () => {
    const items = normalizeOrders(draft.items.filter((item) => item.id !== selectedId));
    setDraft({ ...draft, items }); setSelectedId(items[0]?.id ?? null);
  };

  return <section className="file-review" aria-labelledby="review-heading">
    <header className="review-heading"><div><p className="eyebrow">Bước 4 · Duyệt trên máy</p><h2 id="review-heading">{file.name}</h2>
      <p className="hint">Phiên bản {file.revision} · {FILE_STATUS_LABELS[file.status]}</p></div>
      <span className={`status-label ${approved ? 'is-approved' : ''}`}>{dirty ? 'Có thay đổi chưa lưu' : approved ? 'Đã duyệt phiên bản này' : file.draft ? 'Chưa duyệt' : 'Chưa có bản nháp'}</span></header>
    {file.error ? <p className="notice error" role="alert">{file.error}</p> : null}
    {remoteLocked && file.status !== 'synced' ? <p className="notice warning">Website có thể đã nhận phiên bản này. Chọn bước Đồng bộ để đối chiếu và tiếp tục bằng cùng mã tác vụ. Nội dung được khóa cho đến khi xác định kết quả; sau khi tạo nháp, tiếp tục chỉnh trên web.</p> : null}
    {file.status !== 'synced' && (file.remote?.outfitId || file.remote?.collectionId) ? <div className="notice"><p>Website đã xác nhận một phần kết quả. Có thể kiểm tra bản nháp đã tạo hoặc thử đồng bộ lại.</p>
      <div className="actions">{file.remote.outfitId ? <button type="button" onClick={() => onOpenRemote('outfit')}>Mở outfit đã tạo</button> : null}
        {file.remote.collectionId ? <button type="button" onClick={() => onOpenRemote('collection')}>Mở bộ sưu tập đã tạo</button> : null}</div></div> : null}
    {file.status === 'synced' ? <div className="notice success"><p>Đã tạo nháp trên website. Tiếp tục biên tập và xuất bản bằng trang quản trị.</p>
      <div className="actions"><button type="button" onClick={() => onOpenRemote('outfit')}>Mở outfit nháp</button>
        <button type="button" onClick={() => onOpenRemote('collection')}>Mở bộ sưu tập nháp</button></div></div> : null}
    {!file.draft ? <div className="notice warning"><p>Chưa có kết quả AI. Có thể phân tích lại hoặc nhập thủ công trong các trường bên dưới rồi lưu.</p>
      <button type="button" onClick={onAnalyze} disabled={busy || locked}>Thử phân tích ảnh này</button></div> : null}
    {draft.reviewReasons.length ? <details className="notice warning" open><summary>Những điểm AI yêu cầu kiểm tra</summary>
      <ul>{draft.reviewReasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></details> : null}
    <div className="review-columns"><div className="image-review-column">
      <SourcePreview source={source} crop={selected?.crop ?? draft.modelCrop} label="Poster gốc đã xoay đúng chiều" />
      <p className="hint">Khung viền trên poster là vùng món đang chọn; khi chưa chọn món, đó là vùng người mẫu.</p>
      <CropPreview source={source} crop={draft.modelCrop} label="Ảnh người mẫu sau crop"
        anchors={draft.items.map((item) => ({ id: item.id, label: item.name, point: item.sourceAnchor }))} />
      <p className="notice warning">Crop chỉ cắt vùng hình chữ nhật. Mũi tên hoặc chữ đè lên quần áo vẫn còn trong ảnh; cần kiểm tra trước khi đăng.</p>
    </div><div className="draft-edit-column"><fieldset disabled={busy || locked} className="plain-fieldset">
      <DraftMetadataFields draft={draft} onChange={setDraft} />
      <CropFields label="Vùng người mẫu trên poster" value={draft.modelCrop} onChange={(modelCrop) => setDraft({ ...draft, modelCrop })} />
      <div className="item-editor-heading"><h3>Các món trong outfit ({draft.items.length})</h3>
        <button type="button" onClick={add} disabled={draft.items.length >= MAX_ITEMS_PER_OUTFIT}>Thêm món</button></div>
      <p className="hint">Không cố định số món. Chọn từng món để sửa ảnh, nội dung và điểm nối.</p>
      <div className="item-picker" role="group" aria-label="Chọn món để sửa">{[...draft.items].sort((a, b) => a.side.localeCompare(b.side) || a.order - b.order)
        .map((item) => <button type="button" key={item.id} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>
          {item.side === 'left' ? 'Trái' : 'Phải'} {item.order + 1} · {item.name || 'Chưa đặt tên'}</button>)}</div>
      {selected ? <DraftItemEditor key={selected.id} item={selected} source={source} modelCrop={draft.modelCrop}
        onChange={(patch) => setDraft({ ...draft, items: patchDraftItem(draft.items, selected.id, patch) })} onRemove={remove} />
        : <p className="empty-inline">Chưa có món nào. Thêm món nếu poster có sản phẩm cần giới thiệu.</p>}
    </fieldset></div></div>
    {errors.length ? <div className="notice error" role="alert"><strong>Chưa lưu được bản nháp</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
    {blockers.length && !locked ? <details className="notice warning"><summary>Cần bổ sung trước khi duyệt ({blockers.length})</summary>
      <ul>{blockers.map((reason) => <li key={reason}>{reason}</li>)}</ul></details> : null}
    <footer className="review-actions"><p className="hint">{needsSave ? 'Lưu bản nháp trước khi duyệt.' : 'Sửa bất kỳ nội dung nào sẽ cần lưu và duyệt lại trước khi gửi.'}</p>
      <div className="actions"><button type="button" onClick={onAnalyze} disabled={busy || locked}>Phân tích lại ảnh này</button>
        <button type="button" onClick={() => void save()} disabled={busy || locked || !needsSave}>Lưu bản nháp</button>
        <button type="button" className="primary" disabled={busy || locked || needsSave || approved || blockers.length > 0}
          onClick={() => void onApprove()}>{approved ? 'Đã duyệt' : 'Duyệt phiên bản đã lưu'}</button></div></footer>
  </section>;
}

