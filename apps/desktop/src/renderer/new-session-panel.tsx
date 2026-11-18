import { useState, type FormEvent } from 'react';
import type { DesktopBridge, DesktopOutput, DesktopSession } from '@under30ss/shared';
import type { DesktopWorkspace } from './use-desktop-workspace';
import { TextField } from './form-fields';

export function NewSessionPanel({ api, busy, onRun, onCreate, onCreated }: {
  api: DesktopBridge; busy: boolean; onRun: DesktopWorkspace['run']; onCreate: DesktopWorkspace['createSession']; onCreated: (session: DesktopSession) => void;
}) {
  const [selection, setSelection] = useState<DesktopOutput<'chooseFolder'>>(null);
  const [name, setName] = useState('');
  const choose = async () => {
    const result = await onRun('Chọn folder', () => api.invoke('chooseFolder', {}));
    if (result) { setSelection(result); if (!name) setName(result.folderLabel.slice(0, 120)); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selection || !name.trim()) return;
    const result = await onCreate(selection.selectionId, name.trim());
    if (result) { setSelection(null); setName(''); onCreated(result); }
  };
  return <section className="workspace-panel" aria-labelledby="folder-heading">
    <div className="section-heading"><p className="eyebrow">Bước 2 · Chọn ảnh</p><h2 id="folder-heading">Bắt đầu từ một folder</h2>
      <p>Mỗi poster là một outfit và bộ sưu tập nháp. Có thể đóng ứng dụng rồi mở lại để tiếp tục phần đã lưu.</p></div>
    <form onSubmit={(event) => void submit(event)} className="new-session-form">
      <div className="folder-target"><span className="folder-mark" aria-hidden="true"><svg width="36" height="30" viewBox="0 0 36 30" fill="none"><path d="M2 7V3h12l4 4h16v20H2V7Z" stroke="currentColor" strokeWidth="1.5" /><path d="M2 10h32" stroke="currentColor" strokeWidth="1.5" /></svg></span>
        <strong>{selection?.folderLabel ?? 'Chưa chọn folder ảnh'}</strong><p className="hint">Ứng dụng quét folder con trong giới hạn đã cấu hình, sao chép ảnh và xoay đúng chiều. Folder gốc được giữ nguyên.</p>
        <button type="button" onClick={() => void choose()} disabled={busy}>{selection ? 'Chọn folder khác' : 'Chọn folder ảnh'}</button>
      </div>
      <TextField label="Tên phiên nhập" value={name} onChange={setName} required maxLength={120} placeholder="Tên giúp nhận ra lần nhập này" />
      <button type="submit" className="primary" disabled={busy || !selection || !name.trim()}>{busy ? 'Đang tạo phiên…' : 'Tạo phiên và đọc ảnh'}</button>
    </form>
  </section>;
}
