import { app, BrowserWindow, dialog, ipcMain, net, protocol, safeStorage, session } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { desktopCommandSchemas, type DesktopCommand } from '@under30ss/shared';
import { DesktopRuntime } from './desktop-runtime';
import { redactRuntimeError } from './codex-adapter';

protocol.registerSchemesAsPrivileged([{ scheme: 'import-asset', privileges: { standard: true, secure: true, stream: true } }]);
app.setName('Under30ss Importer');
// Test data is opt-in and ignored by distributed builds.
if (!app.isPackaged && process.env.UNDER30SS_DESKTOP_TEST_DATA) app.setPath('userData', path.resolve(process.env.UNDER30SS_DESKTOP_TEST_DATA));
let window: BrowserWindow | null = null;
let runtime: DesktopRuntime;
const encryptionAvailable = () => safeStorage.isEncryptionAvailable()
  && (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');

const start = async () => {
  runtime = new DesktopRuntime(app.getPath('userData'), {
    encryption: { available: encryptionAvailable, encrypt: (value) => safeStorage.encryptString(value), decrypt: (value) => safeStorage.decryptString(value) },
    chooseFolder: async () => {
      const result = await dialog.showOpenDialog(window!, { title: 'Chọn folder ảnh poster', properties: ['openDirectory'] });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    },
    openExternal: async (url) => { const { shell } = await import('electron'); await shell.openExternal(url); },
    emit: (event) => { if (window && !window.isDestroyed()) window.webContents.send('desktop:progress', event); },
  });
  await protocol.handle('import-asset', async (request) => {
    try {
      const url = new URL(request.url);
      const parts = url.pathname.split('/').filter(Boolean);
      if (request.method !== 'GET' || url.hostname !== 'asset' || parts.length !== 2 || url.search || url.hash) return new Response(null, { status: 403 });
      const file = await runtime.store.assetPath(decodeURIComponent(parts[0]!), decodeURIComponent(parts[1]!));
      const response = await net.fetch(pathToFileURL(file).href);
      return new Response(response.body, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch { return new Response(null, { status: 404 }); }
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  window = new BrowserWindow({ width: 1440, height: 960, minWidth: 720, minHeight: 620,
    show: !(!app.isPackaged && process.env.UNDER30SS_DESKTOP_SMOKE === '1'),
    backgroundColor: '#faf8f5', title: 'Under30ss · Nhập bộ sưu tập',
    webPreferences: { preload: path.join(__dirname, '../preload/index.cjs'), contextIsolation: true, nodeIntegration: false,
      sandbox: true, webSecurity: true, allowRunningInsecureContent: false, devTools: !app.isPackaged },
  });
  window.removeMenu();
  const devUrl = !app.isPackaged ? process.env.DESKTOP_RENDERER_URL : undefined;
  if (devUrl) {
    const url = new URL(devUrl);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('Dev renderer phải chạy qua HTTP loopback');
  }
  const documentUrl = devUrl || pathToFileURL(path.join(__dirname, '../renderer/index.html')).href;
  ipcMain.handle('desktop:invoke', async (event, command: unknown, input: unknown) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame
      || event.senderFrame.url.split('#')[0] !== documentUrl.split('#')[0]) throw new Error('Nguồn IPC không được phép');
    if (typeof command !== 'string' || !Object.hasOwn(desktopCommandSchemas, command)) throw new Error('Lệnh desktop không hợp lệ');
    try { return await runtime.invoke(command as DesktopCommand, input); }
    catch (error) {
      const message = redactRuntimeError(error instanceof Error ? error.message : 'Thao tác thất bại');
      // eslint-disable-next-line preserve-caught-error -- Only redacted diagnostics may cross the IPC boundary.
      throw new Error(message);
    }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-frame-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.once('closed', () => { void runtime.jobs.shutdown(); window = null; });
  if (devUrl) await window.loadURL(documentUrl);
  else await window.loadFile(path.join(__dirname, '../renderer/index.html'));
};
const ownsInstance = app.requestSingleInstanceLock();
app.on('second-instance', () => {
  if (window && !window.isDestroyed() && process.env.UNDER30SS_DESKTOP_SMOKE !== '1') {
    if (window.isMinimized()) window.restore();
    window.show(); window.focus();
  }
});
if (!ownsInstance) app.quit();
else app.whenReady().then(start).catch((error: unknown) => {
  console.error(redactRuntimeError(error instanceof Error ? error.message : 'Không khởi động được desktop'));
  app.exit(1);
});
let shutdownComplete = false;
app.on('before-quit', (event) => {
  if (runtime?.jobs.hasActive() && !shutdownComplete) {
    event.preventDefault();
    void runtime.jobs.shutdown().finally(() => { shutdownComplete = true; app.quit(); });
  }
});
app.on('window-all-closed', () => app.quit());
