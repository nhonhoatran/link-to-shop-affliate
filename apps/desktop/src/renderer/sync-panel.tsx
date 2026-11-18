import type { DesktopSession, DesktopSettingsView } from '@under30ss/shared';

export function SyncPanel({ session, settings, busy, onSync, onReview }: {
  session: DesktopSession; settings: DesktopSettingsView | null; busy: boolean; onSync: () => void; onReview: () => void;
}) {
  const destination = session.destinationOrigin ?? settings?.settings.siteUrl ?? '';
  const differentSite = !!session.destinationOrigin && session.destinationOrigin !== settings?.settings.siteUrl;
  const pending = session.counts.approved;
  return <section className="workspace-panel sync-panel" aria-labelledby="sync-heading">
    <div className="section-heading"><p className="eyebrow">Bước 5 · Đồng bộ HTTPS</p><h2 id="sync-heading">Gửi các bản nháp đã duyệt</h2>
      <p>Website tạo media, bộ sưu tập và outfit nháp. Xuất bản bằng luồng quản trị trên web sau khi kiểm tra.</p></div>
    <div className="destination"><span className="eyebrow">Website nhận dữ liệu</span><strong>{settings?.settings.siteName || 'Môi trường đã cấu hình'}</strong>
      <span className="destination-url">{destination || 'Chưa cấu hình website'}</span></div>
    {differentSite ? <p className="notice error" role="alert">Phiên này đã gắn với website {session.destinationOrigin}. Chuyển cấu hình về đúng website và token trước khi tiếp tục.</p> : null}
    <dl className="session-stats"><div><dt>Tổng ảnh</dt><dd>{session.counts.total}</dd></div><div><dt>Đã duyệt, chờ gửi</dt><dd>{session.counts.approved}</dd></div>
      <div><dt>Đã đồng bộ</dt><dd>{session.counts.synced}</dd></div><div><dt>Có lỗi</dt><dd>{session.counts.failed}</dd></div></dl>
    <p className="notice">Chỉ phiên bản đã lưu và duyệt mới được gửi. Mục đã đồng bộ giữ nguyên ID khi thử lại; lỗi từng mục được hiển thị trong danh sách ảnh.</p>
    {!pending ? <p className="hint">{session.counts.synced ? 'Các mục đã duyệt hiện tại đã được đồng bộ. Có thể duyệt thêm ảnh trong phiên.' : 'Chưa có bản nháp đã duyệt để gửi.'}</p> : null}
    <div className="actions"><button type="button" className="primary" disabled={busy || !pending || !settings?.credential.configured || !destination || differentSite}
      onClick={onSync}>{session.counts.failed ? 'Thử đồng bộ lại mục đã duyệt' : 'Đồng bộ mục đã duyệt'}</button>
      <button type="button" onClick={onReview} disabled={busy}>Quay lại duyệt ảnh</button></div>
  </section>;
}

