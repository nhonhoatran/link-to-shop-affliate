import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { afterEach, describe, expect, it } from 'vitest';
import { readBoundedText, readRecoverableJson, writeAtomicJson } from '../../src/main/atomic-json';
import { scanImageFolder } from '../../src/main/folder-scanner';
import { checkedLocalFile, insideDirectory, sessionDirectory } from '../../src/main/local-paths';
import { SessionStore } from '../../src/main/session-store';
import { cleanupDirectories, imageFixture, sessionFixture, settingsFixture, temporaryDirectory } from './test-fixtures';

afterEach(cleanupDirectories);

describe('image folder admission', () => {
  it('copies normalized source bytes into private session storage without changing the folder', async () => {
    const { source, store, file, session } = await sessionFixture();
    const bytes = await readFile(source);
    expect(file.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    const admitted = await store.assetPath(session.id, file.sourceAssetId);
    expect(insideDirectory(store.directory(session.id), admitted)).toBe(true);
    expect(admitted).not.toBe(source);
    expect(await sharp(admitted).metadata()).toMatchObject({ width: 100, height: 200, format: 'png' });
    expect(await readFile(source)).toEqual(bytes);
    expect((await store.get(session.id)).session.counts.total).toBe(1);
  });
  it('normalizes EXIF rotation before reporting geometry and keeps corrupt images out', async () => {
    const directory = await temporaryDirectory(); const folder = path.join(directory, 'input'); await mkdir(folder);
    const rotated = await sharp({ create: { width: 80, height: 40, channels: 3, background: 'red' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    await writeFile(path.join(folder, 'rotated.jpg'), rotated);
    await writeFile(path.join(folder, 'broken.png'), 'not an image');
    const store = new SessionStore(path.join(directory, 'state'));
    const session = await store.create(folder, 'Phiên xoay ảnh', settingsFixture());
    const record = await store.get(session.id);
    expect(record.files).toHaveLength(1);
    expect(record.files[0]).toMatchObject({ name: 'rotated.jpg', width: 40, height: 80 });
    expect(record.session.warnings.some((warning) => warning.includes('broken.png'))).toBe(true);
    expect(await readFile(path.join(folder, 'rotated.jpg'))).toEqual(rotated);
  });
  it('enforces count, scan-entry, extension and byte limits configured in main', async () => {
    const folder = await temporaryDirectory();
    await writeFile(path.join(folder, 'a.PNG'), await imageFixture());
    await writeFile(path.join(folder, 'b.png'), await imageFixture());
    await writeFile(path.join(folder, 'ignored.txt'), 'ignored');
    const settings = settingsFixture(); settings.limits.maxFiles = 1;
    const names: string[] = [];
    const countWarnings = await scanImageFolder(folder, settings, async (image) => { names.push(image.name); });
    expect(names).toHaveLength(1); expect(countWarnings.join(' ')).toContain('giới hạn');
    settings.limits.maxFiles = 10; settings.limits.maxScanEntries = 1;
    const entryWarnings = await scanImageFolder(folder, settings, async () => undefined);
    expect(entryWarnings.join(' ')).toContain('giới hạn');
    settings.limits.maxScanEntries = 10; settings.limits.maxFileBytes = 1;
    const byteWarnings = await scanImageFolder(folder, settings, async () => { throw new Error('Must not admit oversized images'); });
    expect(byteWarnings.filter((warning) => warning.includes('quá dung lượng'))).toHaveLength(2);
  });
  it('skips directory junctions and blocks path traversal and parent-link escapes', async () => {
    const directory = await temporaryDirectory(); const selected = path.join(directory, 'selected'); const outside = path.join(directory, 'outside');
    await mkdir(selected); await mkdir(outside); await writeFile(path.join(outside, 'secret.png'), await imageFixture());
    await symlink(outside, path.join(selected, 'escape'), 'junction');
    const files: string[] = [];
    const warnings = await scanImageFolder(selected, settingsFixture(), async (image) => { files.push(image.name); });
    expect(files).toEqual([]); expect(warnings.join(' ')).toContain('Bỏ qua liên kết');
    await expect(checkedLocalFile(selected, '../outside/secret.png')).rejects.toThrow('ngoài phạm vi');
    await expect(checkedLocalFile(selected, 'escape/secret.png')).rejects.toThrow('ngoài phiên');
    expect(insideDirectory(selected, `${selected}-sibling/file.png`)).toBe(false);
    expect(() => sessionDirectory(directory, '../escape')).toThrow();
  });
});

describe('durable session checkpoints', () => {
  it('restores incomplete writes from backup and bounds file reads', async () => {
    const directory = await temporaryDirectory(); const file = path.join(directory, 'checkpoint.json');
    const schema = z.strictObject({ revision: z.number() });
    await writeAtomicJson(file, { revision: 1 }); await writeAtomicJson(file, { revision: 2 });
    await writeFile(file, '{partial');
    expect(await readRecoverableJson(file, schema, 200)).toEqual({ revision: 1 });
    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ revision: 1 });
    await expect(readBoundedText(file, 1)).rejects.toThrow('giới hạn');
    expect((await readdir(directory)).some((name) => name.endsWith('.tmp'))).toBe(false);
  });
  it('marks interrupted analysis and sync on restart while preserving completed data', async () => {
    const { store, session, file } = await sessionFixture();
    await store.change(session.id, (record) => { record.files[0]!.status = 'analyzing'; record.scanComplete = false; });
    const reopened = new SessionStore(store.root);
    const record = await reopened.get(session.id);
    expect(record.files[0]).toMatchObject({ id: file.id, status: 'interrupted', revision: 0 });
    expect(record.session.warnings.join(' ')).toContain('Quét folder bị gián đoạn');
    await reopened.change(session.id, (value) => { value.files[0]!.status = 'syncing'; });
    expect((await new SessionStore(store.root).get(session.id)).files[0]!.status).toBe('interrupted');
  });
  it('serializes concurrent changes and does not poison its queue after a rejected mutation', async () => {
    const { store, session } = await sessionFixture();
    await Promise.all(Array.from({ length: 5 }, () => store.change(session.id, (record) => { record.files[0]!.revision++; })));
    await expect(store.change(session.id, () => { throw new Error('rejected'); })).rejects.toThrow('rejected');
    await store.change(session.id, (record) => { record.files[0]!.revision++; });
    expect((await new SessionStore(store.root).get(session.id)).files[0]!.revision).toBe(6);
    const copy = await store.get(session.id); copy.files[0]!.revision = 999;
    expect((await store.get(session.id)).files[0]!.revision).toBe(6);
  });
  it('rejects a manifest asset that crosses into another session', async () => {
    const { store, session, folder } = await sessionFixture();
    const other = await store.create(folder, 'Phiên khác', settingsFixture());
    const otherFile = (await store.get(other.id)).files[0]!;
    const target = await store.assetPath(other.id, otherFile.sourceAssetId);
    const checkpoint = path.join(store.directory(session.id), 'manifest.json');
    const record = JSON.parse(await readFile(checkpoint, 'utf8'));
    record.files[0].assets['borrowed-source'] = path.relative(store.directory(session.id), target);
    await writeFile(checkpoint, JSON.stringify(record));
    await expect(new SessionStore(store.root).assetPath(session.id, 'borrowed-source')).rejects.toThrow('ngoài phạm vi');
  });
  it('rejects a session-root junction instead of reading or listing its manifest', async () => {
    const { store, session } = await sessionFixture();
    const alias = 'linked-session';
    await symlink(store.directory(session.id), store.directory(alias), 'junction');
    await expect(new SessionStore(store.root).get(alias)).rejects.toThrow('Thư mục phiên không hợp lệ');
    const listing = await new SessionStore(store.root).list(1, 1);
    expect(listing.total).toBe(1); expect(listing.items).toHaveLength(1);
    expect(listing.items[0]).not.toHaveProperty('config');
  });
});
