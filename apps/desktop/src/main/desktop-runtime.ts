import { randomUUID } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import path from 'node:path';
import { clientImportIdSchema, desktopCommandSchemas, type DesktopCommand, type DesktopInput, type DesktopOutput,
  type DesktopProgress } from '@under30ss/shared';
import { approveDesktopDraft, saveDesktopDraft } from './draft-actions';
import { DesktopJobs } from './desktop-jobs';
import { SessionStore, fileView, findStoredFile } from './session-store';
import { SettingsStore, type CredentialEncryption } from './settings-store';

export interface DesktopHost {
  chooseFolder(): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  emit(event: DesktopProgress): void;
  encryption: CredentialEncryption;
}
export class DesktopRuntime {
  readonly store: SessionStore;
  readonly settings: SettingsStore;
  readonly jobs: DesktopJobs;
  private readonly selections = new Map<string, string>();
  constructor(root: string, private readonly host: DesktopHost) {
    this.store = new SessionStore(root);
    this.settings = new SettingsStore(root, host.encryption);
    this.jobs = new DesktopJobs(this.store, this.settings, (event) => host.emit(event));
  }
  async invoke<K extends DesktopCommand>(command: K, raw: unknown): Promise<DesktopOutput<K>> {
    const input = desktopCommandSchemas[command].input.parse(raw) as DesktopInput<K>;
    const result = await this.dispatch(command, input);
    return desktopCommandSchemas[command].output.parse(result) as DesktopOutput<K>;
  }
  private async dispatch(command: DesktopCommand, input: DesktopInput<DesktopCommand>): Promise<unknown> {
    switch (command) {
      case 'readSettings': return this.settings.view();
      case 'saveSettings': {
        const args = desktopCommandSchemas.saveSettings.input.parse(input);
        return this.settings.save(args.settings, args.token, args.clearToken);
      }
      case 'chooseFolder': {
        const folder = await this.host.chooseFolder();
        if (!folder) return null;
        const actual = await realpath(folder);
        const selectionId = randomUUID();
        this.selections.clear(); this.selections.set(selectionId, actual);
        return { selectionId, folderLabel: path.basename(actual) };
      }
      case 'createSession': {
        const args = desktopCommandSchemas.createSession.input.parse(input);
        const folder = this.selections.get(args.selectionId);
        if (!folder) throw new Error('Folder chưa được chọn qua hộp thoại hoặc đã hết hiệu lực');
        this.selections.delete(args.selectionId);
        return this.store.create(folder, args.name, await this.settings.settings());
      }
      case 'listSessions': {
        const args = desktopCommandSchemas.listSessions.input.parse(input);
        return this.store.list(args.page, args.size);
      }
      case 'getSession': return (await this.store.get(desktopCommandSchemas.getSession.input.parse(input).sessionId)).session;
      case 'getFile': {
        const args = desktopCommandSchemas.getFile.input.parse(input);
        return fileView(findStoredFile(await this.store.get(args.sessionId), args.fileId));
      }
      case 'listFiles': {
        const args = desktopCommandSchemas.listFiles.input.parse(input);
        const record = await this.store.get(args.sessionId);
        const files = record.files.filter((file) => !args.status || file.status === args.status);
        return { items: files.slice((args.page - 1) * args.size, args.page * args.size).map(fileView), total: files.length, page: args.page, size: args.size };
      }
      case 'updateDraft': {
        const args = desktopCommandSchemas.updateDraft.input.parse(input);
        if (this.jobs.active(args.sessionId)) throw new Error('Chờ tác vụ kết thúc trước khi sửa bản nháp');
        const result = await saveDesktopDraft(this.store, args.sessionId, args.fileId, args.expectedRevision, args.draft);
        this.host.emit({ sessionId: args.sessionId, fileId: args.fileId, kind: 'file' });
        return result;
      }
      case 'approve': {
        const args = desktopCommandSchemas.approve.input.parse(input);
        if (this.jobs.active(args.sessionId)) throw new Error('Chờ tác vụ kết thúc trước khi duyệt');
        const result = await approveDesktopDraft(this.store, args.sessionId, args.fileId, args.expectedRevision);
        this.host.emit({ sessionId: args.sessionId, fileId: args.fileId, kind: 'file' });
        return result;
      }
      case 'analyze': {
        const args = desktopCommandSchemas.analyze.input.parse(input);
        return this.jobs.analyze(args.sessionId, args.fileIds);
      }
      case 'cancel': return this.jobs.cancel(desktopCommandSchemas.cancel.input.parse(input).sessionId);
      case 'sync': return this.jobs.sync(desktopCommandSchemas.sync.input.parse(input).sessionId);
      case 'checkConnection': return this.jobs.checkConnection();
      case 'openRemote': {
        const args = desktopCommandSchemas.openRemote.input.parse(input);
        const record = await this.store.get(args.sessionId);
        const file = findStoredFile(record, args.fileId);
        const id = args.kind === 'outfit' ? file.remote?.outfitId : file.remote?.collectionId;
        if (!id || !record.session.destinationOrigin) throw new Error('Chưa có kết quả đồng bộ được xác nhận');
        clientImportIdSchema.parse(id);
        const pathname = `/admin/${args.kind === 'outfit' ? 'outfits' : 'collections'}/${encodeURIComponent(id)}`;
        await this.host.openExternal(new URL(pathname, record.session.destinationOrigin).href);
        return { opened: true };
      }
    }
  }
}
