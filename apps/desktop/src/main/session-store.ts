import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { clientImportIdSchema, desktopFileSchema, desktopSessionSchema, importHashSchema, type DesktopFile, type DesktopSession, type DesktopSettings } from '@under30ss/shared';
import { readRecoverableJson, writeAtomicJson } from './atomic-json';
import { scanImageFolder } from './folder-scanner';
import { normalizeSourceImage } from './image-assets';
import { checkedLocalFile, checkedSessionDirectory, sessionDirectory } from './local-paths';

const storedFileSchema = desktopFileSchema.extend({ assets: z.record(z.string(), z.string()) });
const checkpointSchema = z.strictObject({ version: z.literal(1), session: desktopSessionSchema, files: z.array(storedFileSchema),
  scanComplete: z.boolean(), credentialFingerprint: importHashSchema.nullable().default(null) });
export type StoredSession = z.infer<typeof checkpointSchema>;
export type StoredFile = z.infer<typeof storedFileSchema>;
// Technical envelope: at most 5,000 source files, each with the web contract's bounded item count.
const MAX_CHECKPOINT_BYTES = 256 * 1024 * 1024;
export const fileView = ({ assets: _assets, ...file }: StoredFile): DesktopFile => file;
const countFiles = (files: StoredFile[]) => ({
  total: files.length, analyzed: files.filter((file) => file.draft !== null).length,
  approved: files.filter((file) => file.approvedRevision === file.revision && file.status !== 'synced').length,
  synced: files.filter((file) => file.status === 'synced').length,
  failed: files.filter((file) => ['error', 'interrupted', 'unsupported'].includes(file.status)).length,
});
export const findStoredFile = (record: StoredSession, fileId: string): StoredFile => {
  const file = record.files.find((entry) => entry.id === fileId);
  if (!file) throw new Error('Không tìm thấy ảnh trong phiên');
  return file;
};

export class SessionStore {
  private readonly cache = new Map<string, StoredSession>();
  private readonly queues = new Map<string, Promise<unknown>>();
  constructor(readonly root: string) {}
  directory(id: string) { return sessionDirectory(this.root, id); }
  private checkpoint(id: string) { return path.join(this.directory(id), 'manifest.json'); }
  private async persist(record: StoredSession) {
    record.session.counts = countFiles(record.files);
    record.session.updatedAt = new Date().toISOString();
    await writeAtomicJson(this.checkpoint(record.session.id), checkpointSchema.parse(record));
  }
  async get(id: string): Promise<StoredSession> {
    clientImportIdSchema.parse(id);
    const existing = this.cache.get(id);
    if (existing) return structuredClone(existing);
    await checkedSessionDirectory(this.root, id);
    const record = await readRecoverableJson(this.checkpoint(id), checkpointSchema, MAX_CHECKPOINT_BYTES);
    if (record.session.id !== id) throw new Error('Manifest không khớp phiên');
    let changed = false;
    for (const file of record.files) {
      if (['analyzing', 'syncing'].includes(file.status)) {
        file.status = 'interrupted'; file.error = 'Tác vụ bị gián đoạn. Có thể thử lại.'; changed = true;
      }
    }
    if (!record.scanComplete && !record.session.warnings.includes('Quét folder bị gián đoạn; phiên giữ các ảnh đã sao chép.')) {
      record.session.warnings.push('Quét folder bị gián đoạn; phiên giữ các ảnh đã sao chép.'); changed = true;
    }
    if (changed) await this.persist(record);
    this.cache.set(id, record);
    return structuredClone(record);
  }
  async change<T>(id: string, mutate: (record: StoredSession) => Promise<T> | T): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(async () => {
      const next = await this.get(id);
      const value = await mutate(next);
      await this.persist(next);
      this.cache.set(id, next);
      return value;
    });
    this.queues.set(id, operation);
    try { return await operation; }
    finally { if (this.queues.get(id) === operation) this.queues.delete(id); }
  }
  async create(folder: string, name: string, config: DesktopSettings): Promise<DesktopSession> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const record: StoredSession = { version: 1, scanComplete: true, credentialFingerprint: null, files: [], session: {
      id, name, folderLabel: path.basename(folder), createdAt: now, updatedAt: now,
      destinationOrigin: null, config: structuredClone(config), sourceFingerprint: createHash('sha256').update('').digest('hex'),
      warnings: [], counts: countFiles([]),
    } };
    await mkdir(this.directory(id), { recursive: true });
    record.scanComplete = false;
    this.cache.set(id, record);
    await this.persist(record);
    const warnings = await scanImageFolder(folder, config, async (image) => {
      const directory = path.join(this.directory(id), 'files', image.id);
      const normalized = await normalizeSourceImage(image.bytes, directory, config.limits.maxSourcePixels);
      const sourceAssetId = `source-${image.id}`;
      await this.change(id, (current) => {
        current.files.push({ id: image.id, name: image.name, sha256: image.sha256, sourceAssetId,
          width: normalized.width, height: normalized.height, status: 'pending', revision: 0, approvedRevision: null,
          analysis: null, draft: null, modelAssetId: null, itemAssetIds: {}, error: null, remote: null,
          assets: { [sourceAssetId]: path.relative(this.directory(id), normalized.path) },
        });
        current.session.sourceFingerprint = createHash('sha256').update(JSON.stringify(current.files.map((file) => [file.name, file.sha256]))).digest('hex');
      });
    });
    await this.change(id, (current) => { current.scanComplete = true; current.session.warnings = warnings.slice(0, 100); });
    return (await this.get(id)).session;
  }
  async list(page: number, size: number) {
    await mkdir(path.join(this.root, 'sessions'), { recursive: true });
    const entries = await readdir(path.join(this.root, 'sessions'), { withFileTypes: true });
    const sessions: DesktopSession[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || !clientImportIdSchema.safeParse(entry.name).success) continue;
      try { sessions.push((await this.get(entry.name)).session); } catch { /* Invalid checkpoints are never exposed as usable sessions. */ }
    }
    sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return { items: sessions.slice((page - 1) * size, page * size).map(({ config: _config, sourceFingerprint: _fingerprint, warnings: _warnings, ...summary }) => summary),
      total: sessions.length, page, size };
  }
  async assetPath(sessionId: string, assetId: string) {
    clientImportIdSchema.parse(assetId);
    const record = await this.get(sessionId);
    const file = record.files.find((entry) => Object.hasOwn(entry.assets, assetId));
    const relative = file?.assets[assetId];
    if (!relative) throw new Error('Ảnh không thuộc phiên');
    return checkedLocalFile(await checkedSessionDirectory(this.root, sessionId), relative);
  }
}
