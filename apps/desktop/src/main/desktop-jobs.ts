import path from 'node:path';
import { type DesktopProgress } from '@under30ss/shared';
import { analyzePoster, redactRuntimeError } from './codex-adapter';
import { draftFromAnalysis, saveDesktopDraft } from './draft-actions';
import { ImportClient } from './import-client';
import { type SessionStore, findStoredFile } from './session-store';
import type { SettingsStore } from './settings-store';
import { syncApprovedSession } from './sync-session';

export class DesktopJobs {
  private readonly jobs = new Map<string, AbortController>();
  private readonly completions = new Set<Promise<void>>();
  constructor(private readonly store: SessionStore, private readonly settings: SettingsStore,
    private readonly emit: (event: DesktopProgress) => void) {}
  active(id: string) { return this.jobs.has(id); }
  private async start(id: string, run: (signal: AbortSignal) => Promise<void>) {
    if (this.active(id)) throw new Error('Phiên đang có tác vụ; hãy hủy hoặc chờ hoàn tất');
    const controller = new AbortController();
    this.jobs.set(id, controller);
    try { await this.store.get(id); }
    catch (error) { this.jobs.delete(id); throw error; }
    let message = 'Tác vụ đã dừng; xem trạng thái từng ảnh';
    const completion = run(controller.signal).catch((error: unknown) => {
      message = controller.signal.aborted ? 'Đã hủy tác vụ' : redactRuntimeError(error instanceof Error ? error.message : 'Tác vụ thất bại');
    }).finally(() => {
      this.jobs.delete(id); this.completions.delete(completion);
      this.emit({ sessionId: id, kind: 'session', message: controller.signal.aborted ? 'Đã hủy tác vụ' : message });
    });
    this.completions.add(completion);
    return { started: true };
  }
  async analyze(sessionId: string, fileIds?: string[]) {
    const record = await this.store.get(sessionId);
    if (fileIds?.some((id) => !record.files.some((file) => file.id === id))) throw new Error('Ảnh không thuộc phiên');
    const files = record.files.filter((file) => (fileIds ? fileIds.includes(file.id) : !file.draft && ['pending', 'error', 'interrupted'].includes(file.status)) && file.status !== 'synced'
      && (!file.remote || (file.remote.status === 'failed' && !file.remote.retryOnly && !file.remote.collectionId && !file.remote.outfitId)));
    if (!files.length) throw new Error('Không có ảnh có thể phân tích');
    return this.start(sessionId, async (signal) => {
      for (const selected of files) {
        if (signal.aborted) break;
        const fileId = selected.id;
        try {
          await this.store.change(sessionId, (current) => {
            const file = findStoredFile(current, fileId);
            file.status = 'analyzing'; file.approvedRevision = null; file.error = null;
          });
          this.emit({ sessionId, fileId, kind: 'file', message: 'Codex đang phân tích ảnh' });
          const source = await this.store.assetPath(sessionId, selected.sourceAssetId);
          const analysis = await analyzePoster(source, record.session.config, path.join(this.store.root, 'agent-work'), signal);
          signal.throwIfAborted();
          await this.store.change(sessionId, (current) => {
            const file = findStoredFile(current, fileId);
            file.analysis = analysis;
            file.status = 'ready';
          });
          const current = findStoredFile(await this.store.get(sessionId), fileId);
          await saveDesktopDraft(this.store, sessionId, fileId, current.revision, draftFromAnalysis(analysis, selected.name));
          if (analysis.status === 'unsupported') await this.store.change(sessionId, (value) => { findStoredFile(value, fileId).status = 'unsupported'; });
        } catch (error) {
          await this.store.change(sessionId, (current) => {
            const file = findStoredFile(current, fileId);
            file.status = signal.aborted ? 'interrupted' : 'error';
            file.error = signal.aborted ? 'Đã hủy; có thể phân tích lại ảnh' : redactRuntimeError(error instanceof Error ? error.message : 'Không phân tích được ảnh');
          });
        }
        this.emit({ sessionId, fileId, kind: 'file' });
      }
    });
  }
  async sync(sessionId: string) {
    const connection = await this.settings.connection();
    return this.start(sessionId, (signal) => syncApprovedSession(this.store, sessionId,
      new ImportClient(connection.origin, connection.token, connection.timeoutMs, signal), signal, this.emit));
  }
  async checkConnection() {
    const connection = await this.settings.connection();
    return new ImportClient(connection.origin, connection.token, connection.timeoutMs, new AbortController().signal).capabilities();
  }
  cancel(sessionId: string) {
    const controller = this.jobs.get(sessionId);
    controller?.abort();
    return { cancelled: !!controller };
  }
  hasActive() { return this.jobs.size > 0; }
  async shutdown() {
    for (const controller of this.jobs.values()) controller.abort();
    await Promise.allSettled([...this.completions]);
  }
}
