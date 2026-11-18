import type { DesktopBridge, DesktopFileStatus, DesktopSession } from '@under30ss/shared';
import { FILE_STATUS_LABELS, type FilePage } from './desktop-types';
import { Pagination } from './pagination';

export function FileBrowser({ api, session, files, fileId, filter, busy, onPage, onFilter, onSelect, onAnalyze, onCancel }: {
  api: DesktopBridge; session: DesktopSession; files: FilePage | null; fileId: string | null; filter: DesktopFileStatus | ''; busy: boolean;
  onPage: (page: number) => void; onFilter: (status: DesktopFileStatus | '') => void; onSelect: (id: string) => void;
  onAnalyze: () => void; onCancel: () => void;
}) {
  return <section className="file-browser" aria-label="Ảnh trong phiên">
    <div className="section-heading"><p className="eyebrow">Bước 3 · Phân tích</p><h2>{session.name}</h2>
      <p className="hint">{session.folderLabel} · Prompt {session.config.prompt.version}</p></div>
    <div className="analysis-progress"><label htmlFor="analysis-progress">Đã phân tích {session.counts.analyzed}/{session.counts.total} ảnh</label>
      <progress id="analysis-progress" max={Math.max(1, session.counts.total)} value={session.counts.analyzed} />
    </div>
    <div className="actions"><button type="button" className="primary" disabled={busy || !session.counts.total}
      onClick={onAnalyze}>Phân tích các ảnh chưa xong</button><button type="button" onClick={onCancel}>Hủy tác vụ</button></div>
    {session.warnings.length ? <details className="notice warning"><summary>{session.warnings.length} lưu ý khi đọc folder</summary>
      <ul>{session.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details> : null}
    <label className="field file-filter"><span>Lọc trạng thái ảnh</span><select value={filter}
      onChange={(event) => onFilter(event.target.value as DesktopFileStatus | '')} disabled={busy}>
      <option value="">Tất cả trạng thái</option>{Object.entries(FILE_STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
    </select></label>
    {!files ? <p role="status" className="empty-inline">Đang đọc danh sách ảnh…</p> : !files.items.length ? <div className="empty-inline">
      <p>Không có ảnh trong danh sách này.</p><p className="hint">Đổi bộ lọc hoặc chọn folder có định dạng được cho phép trong cấu hình.</p></div> : <ul className="file-list">
      {files.items.map((file) => <li key={file.id}><button type="button" className="file-option" aria-pressed={file.id === fileId}
        onClick={() => onSelect(file.id)} disabled={busy}>
        <img src={api.assetUrl(session.id, file.sourceAssetId)} alt="" width={48} height={64} loading="lazy" />
        <span><strong>{file.name}</strong><span className={`status-text status-${file.status}`}>{FILE_STATUS_LABELS[file.status]}</span>
          <span className="hint">{file.width} × {file.height}{file.draft ? ` · ${file.draft.items.length} món` : ''}</span></span>
      </button></li>)}
    </ul>}
    {files ? <Pagination {...files} label="Danh sách ảnh" onPage={onPage} disabled={busy} /> : null}
  </section>;
}

