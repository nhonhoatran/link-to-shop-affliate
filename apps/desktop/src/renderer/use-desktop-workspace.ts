import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_DESKTOP_SETTINGS, type DesktopBridge, type DesktopDraft, type DesktopFile, type DesktopFileStatus,
  type DesktopSession, type DesktopSettings, type DesktopSettingsView,
} from '@under30ss/shared';
import { messageOf, type FilePage, type SessionPage } from './desktop-types';

export function useDesktopWorkspace(api: DesktopBridge) {
  const [settings, setSettings] = useState<DesktopSettingsView | null>(null);
  const [sessions, setSessions] = useState<SessionPage>({ items: [], total: 0, page: 1, size: DEFAULT_DESKTOP_SETTINGS.limits.pageSize });
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [files, setFiles] = useState<FilePage | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [file, setFile] = useState<DesktopFile | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<DesktopFileStatus | ''>('');
  const [version, setVersion] = useState(0);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  const size = settings?.settings.limits.pageSize ?? DEFAULT_DESKTOP_SETTINGS.limits.pageSize;
  const currentFile = file?.id === fileId ? file : null;

  useEffect(() => {
    let current = true;
    api.invoke('readSettings', {}).then((value) => { if (current) setSettings(value); })
      .catch((cause: unknown) => { if (current) setError(messageOf(cause)); });
    return () => { current = false; };
  }, [api, settingsVersion]);

  useEffect(() => {
    let current = true;
    api.invoke('listSessions', { page: sessionPage, size }).then((value) => { if (current) setSessions(value); })
      .catch((cause: unknown) => { if (current) setError(messageOf(cause)); });
    return () => { current = false; };
  }, [api, sessionPage, size, version]);

  useEffect(() => {
    if (!sessionId) return;
    let current = true;
    api.invoke('getSession', { sessionId }).then((value) => { if (current) setSession(value); })
      .catch((cause: unknown) => { if (current) setError(messageOf(cause)); });
    api.invoke('listFiles', { sessionId, page, size, ...(filter ? { status: filter } : {}) }).then((value) => {
      if (!current) return;
      setFiles(value);
      setFileId((previous) => value.items.some((entry) => entry.id === previous) ? previous : value.items[0]?.id ?? null);
    }).catch((cause: unknown) => { if (current) setError(messageOf(cause)); });
    return () => { current = false; };
  }, [api, sessionId, page, size, filter, version]);

  useEffect(() => {
    if (!sessionId || !fileId) return;
    let current = true;
    api.invoke('getFile', { sessionId, fileId }).then((value) => { if (current) setFile(value); })
      .catch((cause: unknown) => { if (current) setError(messageOf(cause)); });
    return () => { current = false; };
  }, [api, sessionId, fileId, version]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = api.onProgress((event) => {
      if (event.message) setNotice(event.message);
      clearTimeout(timer);
      // Coalesce bursts of file events without reloading settings or discarding in-progress form edits.
      timer = setTimeout(refresh, 80);
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, [api, refresh]);

  const run = async <T,>(label: string, action: () => Promise<T>): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setBusy(label); setError(''); setNotice('');
    try { return await action(); }
    catch (cause) { setError(messageOf(cause)); return undefined; }
    finally { inFlight.current = false; setBusy(''); }
  };
  const selectSession = (id: string) => {
    if (id === sessionId) { refresh(); return; }
    setSessionId(id); setSession(null); setFiles(null); setFile(null); setFileId(null); setPage(1); setFilter(''); setError('');
  };
  const selectFile = (id: string) => {
    if (id === fileId) { if (!file) refresh(); return; }
    setFile(null); setFileId(id);
  };
  const saveSettings = (value: DesktopSettings, token: string, clearToken: boolean) => run('Lưu cấu hình', async () => {
    const result = await api.invoke('saveSettings', { settings: value, ...(token.trim() ? { token: token.trim() } : {}), clearToken });
    setSettings(result); setNotice('Đã lưu cấu hình. Các phiên đang có giữ nguyên cấu hình phân tích.');
    return result;
  });
  const createSession = (selectionId: string, name: string) => run('Tạo phiên', async () => {
    const result = await api.invoke('createSession', { selectionId, name });
    selectSession(result.id); setSession(result); setSessionPage(1); refresh(); return result;
  });
  const analyze = (fileIds?: string[]) => sessionId ? run('Bắt đầu phân tích', async () => {
    const result = await api.invoke('analyze', { sessionId, ...(fileIds ? { fileIds } : {}) });
    setNotice(result.started ? 'Đã bắt đầu phân tích. Có thể hủy và tiếp tục các ảnh đã hoàn tất.' : 'Phiên đang được xử lý.');
    refresh();
  }) : Promise.resolve(undefined);
  const cancel = async () => {
    if (!sessionId) return;
    try {
      const result = await api.invoke('cancel', { sessionId });
      setNotice(result.cancelled ? 'Đã yêu cầu dừng. Các kết quả đã lưu được giữ lại.' : 'Không có tác vụ đang chạy.'); refresh();
    } catch (cause) { setError(messageOf(cause)); }
  };
  const saveDraft = (draft: DesktopDraft) => sessionId && currentFile ? run('Lưu bản nháp', async () => {
    const result = await api.invoke('updateDraft', { sessionId, fileId: currentFile.id, expectedRevision: currentFile.revision, draft });
    setFile(result); setNotice('Đã lưu bản nháp. Cần duyệt phiên bản này trước khi đồng bộ.'); refresh(); return result;
  }) : Promise.resolve(undefined);
  const approve = () => sessionId && currentFile ? run('Duyệt bản nháp', async () => {
    const result = await api.invoke('approve', { sessionId, fileId: currentFile.id, expectedRevision: currentFile.revision });
    setFile(result); setNotice('Đã duyệt phiên bản hiện tại.'); refresh();
  }) : Promise.resolve(undefined);
  const checkConnection = () => run('Kiểm tra kết nối', async () => {
    const result = await api.invoke('checkConnection', {});
    setNotice(`Kết nối thành công. Quyền ${result.scope}; ảnh tối đa ${(result.uploadMaxBytes / 1024 / 1024).toLocaleString('vi-VN')} MB; mỗi phiên tối đa ${result.sessionMaxOperations} mục và ${result.sessionMaxMedia} ảnh crop.`);
    return result;
  });
  const sync = () => sessionId ? run('Bắt đầu đồng bộ', async () => {
    const result = await api.invoke('sync', { sessionId });
    setNotice(result.started ? 'Đang gửi các phiên bản đã duyệt lên website.' : 'Chưa bắt đầu đồng bộ. Kiểm tra mục đã duyệt.'); refresh();
  }) : Promise.resolve(undefined);
  const openRemote = (kind: 'outfit' | 'collection') => sessionId && currentFile ? run('Mở trang quản trị', () =>
    api.invoke('openRemote', { sessionId, fileId: currentFile.id, kind })) : Promise.resolve(undefined);

  return { settings, sessions, session, files, file: currentFile, sessionId, fileId, busy, error, notice, page, filter,
    selectSession, selectFile, setPage, setSessionPage, setFilter: (value: DesktopFileStatus | '') => { setFilter(value); setPage(1); },
    run, refresh, reload: () => { setSettingsVersion((value) => value + 1); refresh(); }, setError, setNotice,
    saveSettings, createSession, analyze, cancel, saveDraft, approve, checkConnection, sync, openRemote };
}

export type DesktopWorkspace = ReturnType<typeof useDesktopWorkspace>;

