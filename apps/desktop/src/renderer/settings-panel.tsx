import { useId, useState, type FormEvent } from 'react';
import { DEFAULT_POSTER_PROMPT, DEFAULT_POSTER_PROMPT_VERSION, desktopSettingsSchema, type DesktopSettingsView } from '@under30ss/shared';
import type { DesktopWorkspace } from './use-desktop-workspace';
import { TextAreaField, TextField } from './form-fields';
import { SettingsLimits } from './settings-limits';

export function SettingsPanel({ initial, busy, onSave, onCheck }: {
  initial: DesktopSettingsView; busy: boolean; onSave: DesktopWorkspace['saveSettings']; onCheck: DesktopWorkspace['checkConnection'];
}) {
  const [value, setValue] = useState(initial.settings);
  const [token, setToken] = useState('');
  const [clearToken, setClearToken] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const versionId = useId();
  const dirty = JSON.stringify(value) !== JSON.stringify(initial.settings) || !!token || clearToken;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const secret = token;
    setToken('');
    const parsed = desktopSettingsSchema.safeParse(value);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
      return;
    }
    setErrors([]);
    await onSave(parsed.data, secret, clearToken);
    setClearToken(false);
  };
  return <section aria-labelledby="settings-heading" className="workspace-panel settings-panel">
    <div className="section-heading"><p className="eyebrow">Bước 1 · Cấu hình trên máy</p><h2 id="settings-heading">Kết nối công cụ và website</h2>
      <p>Codex phân tích ảnh trên máy. Bản nháp chỉ được gửi lên website sau khi duyệt.</p></div>
    <form onSubmit={(event) => void submit(event)}>
      <fieldset disabled={busy} className="plain-fieldset">
        <legend>Website nhận bản nháp</legend>
        <div className="field-grid">
          <TextField label="Tên môi trường" value={value.siteName} onChange={(siteName) => setValue({ ...value, siteName })}
            placeholder="Ví dụ: Website chính" maxLength={100} />
          <TextField label="Địa chỉ website" value={value.siteUrl} type="url" onChange={(siteUrl) => setValue({ ...value, siteUrl })}
            hint="Chỉ origin HTTPS, không kèm /admin. HTTP chỉ dùng cho loopback khi phát triển." placeholder="https://website.example" />
        </div>
        <TextField label="Token nhập nháp" value={token} onChange={(secret) => { setToken(secret); if (secret) setClearToken(false); }} type="password" autoComplete="off" maxLength={1024}
          hint={initial.credential.configured ? `Đã lưu token ${initial.credential.mask ?? 'được bảo vệ'} cho ${initial.credential.origin ?? 'website hiện tại'}. Để trống để giữ token.`
            : 'Tạo token tại trang quản trị → Token nhập nháp. Token được mã hóa bằng tài khoản hệ điều hành.'} />
        {initial.credential.configured || initial.credential.warning ? <label className="check-label"><input type="checkbox" checked={clearToken}
          onChange={(event) => { setClearToken(event.target.checked); if (event.target.checked) setToken(''); }} />Xóa token đã lưu trên máy</label> : null}
        {initial.credential.warning ? <p className="notice warning" role="status">{initial.credential.warning}</p> : null}
        {!initial.credential.encryptionAvailable ? <p className="notice warning">Hệ điều hành chưa cung cấp mã hóa an toàn. Ứng dụng sẽ từ chối lưu token; kiểm tra lại Windows trước khi kết nối.</p> : null}
      </fieldset>
      <fieldset disabled={busy} className="plain-fieldset">
        <legend>Codex CLI</legend>
        <TextField label="Đường dẫn Codex" value={value.cli.executable} required onChange={(executable) => setValue({ ...value, cli: { ...value.cli, executable } })}
          hint="Dùng Codex CLI chính thức đã cài và đăng nhập. Có thể nhập đường dẫn executable đầy đủ." />
        <div className="field-grid">
          <TextField label="Profile Codex" value={value.cli.profile} onChange={(profile) => setValue({ ...value, cli: { ...value.cli, profile } })}
            hint="Để trống để dùng profile hiện có. Không sửa cấu hình global." maxLength={100} />
          <TextField label="Model" value={value.cli.model} onChange={(model) => setValue({ ...value, cli: { ...value.cli, model } })}
            hint="Để trống để dùng model trong cấu hình CLI." maxLength={100} />
        </div>
        <details className="advanced">
          <summary>Prompt phân tích · đã có sẵn</summary>
          <div className="field"><label htmlFor={versionId}>Phiên bản prompt</label><output id={versionId} aria-describedby={`${versionId}-hint`}>{value.prompt.version}</output>
            <span id={`${versionId}-hint`} className="hint">Phiên bản được tạo tự động khi lưu.</span></div>
          <TextAreaField label="Prompt tiếng Việt" value={value.prompt.text} rows={14} maxLength={30_000}
            onChange={(text) => setValue({ ...value, prompt: { ...value.prompt, text } })}
            hint="Số món do ảnh quyết định. Kết quả cần duyệt; crop không xóa được mũi tên đè trên quần áo." />
          <button type="button" onClick={() => setValue({ ...value, prompt: { version: DEFAULT_POSTER_PROMPT_VERSION, text: DEFAULT_POSTER_PROMPT } })}>Khôi phục prompt mặc định</button>
        </details>
        <SettingsLimits value={value.limits} onChange={(limits) => setValue({ ...value, limits })} />
      </fieldset>
      {errors.length ? <div className="notice error" role="alert"><strong>Cần sửa cấu hình</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div> : null}
      <div className="actions">
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Đang xử lý…' : 'Lưu cấu hình'}</button>
        <button type="button" disabled={busy || dirty || !initial.credential.configured || !value.siteUrl} onClick={() => void onCheck()}>Kiểm tra kết nối website</button>
        {dirty ? <span className="hint">Lưu cấu hình trước khi kiểm tra kết nối.</span> : null}
      </div>
    </form>
  </section>;
}

