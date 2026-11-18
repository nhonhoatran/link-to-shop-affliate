import type { DesktopBridge, DesktopFile, DesktopFileStatus, DesktopOutput } from '@under30ss/shared';

declare global {
  interface Window { desktop: DesktopBridge }
}

export type FilePage = DesktopOutput<'listFiles'>;
export type SessionPage = DesktopOutput<'listSessions'>;
export type WorkspaceView = 'connection' | 'folder' | 'analysis' | 'review' | 'sync';
export const FILE_STATUS_LABELS: Record<DesktopFileStatus, string> = {
  pending: 'Chờ phân tích', analyzing: 'Đang phân tích', ready: 'Chờ duyệt', approved: 'Đã duyệt',
  syncing: 'Đang đồng bộ', synced: 'Đã đồng bộ', error: 'Có lỗi', interrupted: 'Bị gián đoạn', unsupported: 'Cần kiểm tra',
};
export const messageOf = (error: unknown): string => error instanceof Error ? error.message : 'Thao tác chưa hoàn tất. Vui lòng thử lại.';
export const remoteLocksFile = (file: DesktopFile): boolean => !!file.remote
  && !(file.remote.status === 'failed' && !file.remote.collectionId && !file.remote.outfitId && !file.remote.retryOnly);

