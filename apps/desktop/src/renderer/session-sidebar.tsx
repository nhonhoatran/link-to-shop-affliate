import type { SessionPage } from './desktop-types';
import { Pagination } from './pagination';

export function SessionSidebar({ sessions, currentId, busy, onSelect, onPage, onNew }: {
  sessions: SessionPage; currentId: string | null; busy: boolean; onSelect: (id: string) => void;
  onPage: (page: number) => void; onNew: () => void;
}) {
  return <aside className="session-sidebar" aria-label="Phiên nhập trên máy">
    <div className="sidebar-heading"><h2>Phiên nhập</h2><button type="button" onClick={onNew} disabled={busy}>Phiên mới</button></div>
    <p className="hint">Tiến độ và ảnh đã xử lý được lưu trên máy này.</p>
    {!sessions.items.length ? <p className="empty-inline">Chưa có phiên nào. Chọn một folder ảnh để bắt đầu.</p> : <ul className="session-list">
      {sessions.items.map((session) => <li key={session.id}><button type="button" aria-current={session.id === currentId ? 'true' : undefined}
        className="session-option" disabled={busy} onClick={() => onSelect(session.id)}>
        <strong>{session.name}</strong><span className="hint">{session.folderLabel}</span>
        <span>{session.counts.synced}/{session.counts.total} đã gửi · {session.counts.approved} đã duyệt</span>
      </button></li>)}
    </ul>}
    {sessions.total > sessions.size ? <Pagination {...sessions} label="Danh sách phiên" disabled={busy} onPage={onPage} /> : null}
  </aside>;
}

