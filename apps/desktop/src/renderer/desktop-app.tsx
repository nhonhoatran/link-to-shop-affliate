import { useState } from 'react';
import type { DesktopBridge } from '@under30ss/shared';
import { useDesktopWorkspace } from './use-desktop-workspace';
import { type WorkspaceView } from './desktop-types';
import { SessionSidebar } from './session-sidebar';
import { NewSessionPanel } from './new-session-panel';
import { SettingsPanel } from './settings-panel';
import { FileBrowser } from './file-browser';
import { FileReview } from './file-review';
import { SyncPanel } from './sync-panel';

const steps: { id: WorkspaceView; label: string }[] = [
  { id: 'connection', label: 'Kết nối' }, { id: 'folder', label: 'Chọn folder' }, { id: 'analysis', label: 'Phân tích' },
  { id: 'review', label: 'Duyệt' }, { id: 'sync', label: 'Đồng bộ' },
];

export function DesktopApp({ api }: { api: DesktopBridge }) {
  const state = useDesktopWorkspace(api);
  const [view, setView] = useState<WorkspaceView>('folder');
  const [dirty, setDirty] = useState(false);
  const leave = (action: () => void) => {
    if (dirty && !window.confirm('Bản nháp có thay đổi chưa lưu. Rời màn hình và bỏ các thay đổi này?')) return;
    setDirty(false); action();
  };
  const navigate = (target: WorkspaceView) => { if (target !== view) leave(() => setView(target)); };
  const selectFile = (id: string) => {
    if (id === state.fileId && view === 'review' && state.file) return;
    leave(() => { state.selectFile(id); setView('review'); });
  };
  const fileBrowser = state.session ? <FileBrowser api={api} session={state.session} files={state.files} fileId={state.fileId}
    filter={state.filter} busy={!!state.busy} showFileErrors={view === 'analysis'} onPage={(page) => leave(() => state.setPage(page))}
    onFilter={(filter) => leave(() => state.setFilter(filter))} onSelect={selectFile}
    onAnalyze={() => leave(() => { void state.analyze(); })} onCancel={() => void state.cancel()} onChooseFolder={() => navigate('folder')} /> : null;

  return <div className="desktop-app"><a className="skip-link" href="#desktop-main">Đến nội dung chính</a>
    <header className="app-header"><div className="wordmark">Under30ss<span>Desktop</span></div><div><h1>Nhập bộ sưu tập bằng AI</h1>
      <p className="hint">Phân tích · Duyệt trên máy · Gửi bản nháp</p></div><button type="button" className="connection-shortcut"
        onClick={() => navigate('connection')}><span className={`connection-dot ${state.settings?.credential.configured ? 'configured' : ''}`} aria-hidden="true" />
        {state.settings?.settings.siteName || (state.settings?.credential.configured ? 'Đã lưu kết nối' : 'Cấu hình kết nối')}</button></header>
    <div className="app-body"><SessionSidebar sessions={state.sessions} currentId={state.sessionId} busy={!!state.busy}
      onSelect={(id) => leave(() => { state.selectSession(id); setView('analysis'); })}
      onPage={state.setSessionPage} onNew={() => navigate('folder')} />
      <main id="desktop-main" className="app-main" tabIndex={-1}>
        <nav className="workflow-nav" aria-label="Các bước nhập bộ sưu tập"><ol>{steps.map((step, index) => <li key={step.id}>
          <button type="button" aria-current={view === step.id ? 'step' : undefined} onClick={() => navigate(step.id)}
            disabled={!state.sessionId && index >= 2}><span>{index + 1}</span>{step.label}</button></li>)}</ol></nav>
        {state.error ? <div className="notice error global-notice" role="alert"><p>{state.error}</p><div className="actions compact">
          <button type="button" onClick={() => { state.setError(''); state.reload(); }}>Thử tải lại</button>
          <button type="button" onClick={() => state.setError('')}>Đóng thông báo</button></div></div> : null}
        <div className="live-status" role="status" aria-live="polite">{state.busy ? `${state.busy}…` : state.notice}</div>
        {view === 'connection' ? state.settings ? <SettingsPanel key={JSON.stringify(state.settings.settings)} initial={state.settings}
          busy={!!state.busy} onSave={state.saveSettings} onCheck={state.checkConnection} />
          : <p className="empty-inline">Đang đọc cấu hình…</p> : null}
        {view === 'folder' ? <NewSessionPanel api={api} busy={!!state.busy} onRun={state.run} onCreate={state.createSession}
          onCreated={() => setView('analysis')} /> : null}
        {view === 'analysis' ? fileBrowser ?? <p className="empty-inline">Đang đọc phiên nhập…</p> : null}
        {view === 'review' ? <div className="review-workspace">{fileBrowser}<div>{state.file && state.sessionId
          ? <FileReview key={`${state.file.id}:${state.file.revision}`} api={api} file={state.file} sessionId={state.sessionId} busy={!!state.busy}
            onSave={state.saveDraft} onApprove={state.approve} onAnalyze={() => leave(() => { if (state.fileId) void state.analyze([state.fileId]); })}
            onDirty={setDirty} onOpenRemote={(kind) => { void state.openRemote(kind); }} />
          : <p className="empty-inline">Chọn ảnh trong danh sách để xem và duyệt.</p>}</div></div> : null}
        {view === 'sync' && state.session ? <><SyncPanel session={state.session} settings={state.settings} busy={!!state.busy}
          onSync={() => { void state.sync(); }} onReview={() => navigate('review')} />{fileBrowser}</> : null}
      </main></div>
    <footer className="app-footer"><span>Ảnh và tiến độ được lưu trên máy. Token được mã hóa bằng tài khoản hệ điều hành.</span>
      <span>{state.session ? `${state.session.counts.synced}/${state.session.counts.total} ảnh đã đồng bộ` : 'Chưa chọn phiên'}</span></footer>
  </div>;
}
