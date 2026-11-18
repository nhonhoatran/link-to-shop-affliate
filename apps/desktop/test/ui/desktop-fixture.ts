import { vi } from 'vitest';
import { DEFAULT_DESKTOP_SETTINGS, type DesktopBridge, type DesktopDraft, type DesktopFile, type DesktopSession, type DesktopSettingsView } from '@under30ss/shared';

export const settingsFixture = (): DesktopSettingsView => ({
  settings: { ...structuredClone(DEFAULT_DESKTOP_SETTINGS), siteUrl: 'https://preview.example', siteName: 'Website thử nghiệm' },
  credential: { configured: true, mask: 'imp_…ab12', origin: 'https://preview.example', encryptionAvailable: true },
});
export const draftFixture = (): DesktopDraft => ({
  title: 'Phối đồ buổi sáng', slug: 'phoi-do-buoi-sang', seoDescription: '',
  collection: { name: 'Phong cách buổi sáng', slug: 'phong-cach-buoi-sang', description: '' },
  modelCrop: { x: 30, y: 0, width: 40, height: 100 }, reviewReasons: [],
  items: [{ id: 'shirt', name: 'Áo sơ mi', subtitle: '', description: '', side: 'left', order: 0,
    crop: { x: 0, y: 0, width: 20, height: 20 }, sourceAnchor: null, affiliateUrl: '', reviewReasons: [] }],
});
export const fileFixture = (): DesktopFile => ({
  id: 'file-a', name: 'look-a.png', sha256: 'a'.repeat(64), sourceAssetId: 'source-a', width: 941, height: 1672,
  status: 'ready', revision: 1, approvedRevision: null, analysis: null, draft: draftFixture(), modelAssetId: null,
  itemAssetIds: {}, error: null, remote: null,
});
export const sessionFixture = (): DesktopSession => ({
  id: 'session-a', name: 'Phiên thử nghiệm', folderLabel: 'folder-poster',
  createdAt: '2026-11-18T08:00:00.000Z', updatedAt: '2026-11-18T08:00:00.000Z', destinationOrigin: null,
  counts: { total: 1, analyzed: 1, approved: 0, synced: 0, failed: 0 }, config: settingsFixture().settings,
  sourceFingerprint: 'b'.repeat(64), warnings: [],
});
export const bridgeFixture = () => {
  const state = { settings: settingsFixture(), session: sessionFixture(), file: fileFixture() };
  const invoke = vi.fn(async (command: string, input: Record<string, unknown>) => {
    switch (command) {
      case 'readSettings': return state.settings;
      case 'saveSettings': state.settings = { ...state.settings, settings: input.settings as DesktopSettingsView['settings'] }; return state.settings;
      case 'listSessions': return { items: [state.session], total: 1, page: 1, size: 20 };
      case 'getSession': return state.session;
      case 'listFiles': return { items: [state.file], total: 1, page: 1, size: 20 };
      case 'getFile': return state.file;
      case 'updateDraft':
        state.file = { ...state.file, draft: input.draft as DesktopDraft, revision: state.file.revision + 1, approvedRevision: null, status: 'ready' };
        return state.file;
      case 'approve':
        state.file = { ...state.file, approvedRevision: state.file.revision, status: 'approved' };
        state.session = { ...state.session, counts: { ...state.session.counts, approved: 1 } };
        return state.file;
      case 'analyze': case 'sync': return { started: true };
      case 'cancel': return { cancelled: true };
      case 'openRemote': return { opened: true };
      case 'checkConnection': return { contractVersion: 'desktop-import.v1', scope: 'import:draft', uploadMaxBytes: 1024 * 1024,
        sessionMaxMedia: 30, sessionMaxOperations: 30 };
      default: throw new Error(`Unexpected UI command ${command}`);
    }
  });
  const onProgress = vi.fn<DesktopBridge['onProgress']>(() => () => undefined);
  const api: DesktopBridge = { invoke: invoke as DesktopBridge['invoke'], onProgress,
    assetUrl: (sessionId, assetId) => `import-asset://asset/${sessionId}/${assetId}` };
  return { api, invoke, state, onProgress };
};

