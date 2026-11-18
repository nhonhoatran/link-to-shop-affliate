import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopRuntime } from '../../src/main/desktop-runtime';
import { cleanupDirectories, sessionFixture, testEncryption } from './test-fixtures';

afterEach(cleanupDirectories);
const runtimeFixture = async (count = 1) => {
  const fixture = await sessionFixture(count);
  const host = { chooseFolder: vi.fn(async () => fixture.folder), openExternal: vi.fn(async (_url: string) => undefined),
    emit: vi.fn(), encryption: testEncryption() };
  const runtime = new DesktopRuntime(fixture.store.root, host);
  return { ...fixture, runtime, host };
};

describe('validated desktop IPC surface', () => {
  it('accepts folders only through a one-use dialog selection and does not expose their full path', async () => {
    const fixture = await runtimeFixture();
    await expect(fixture.runtime.invoke('createSession', { selectionId: 'unissued', name: 'Import' })).rejects.toThrow('chưa được chọn');
    await expect(fixture.runtime.invoke('createSession', { folder: fixture.folder, name: 'Import' })).rejects.toThrow();
    const selection = await fixture.runtime.invoke('chooseFolder', {});
    expect(selection).not.toBeNull(); expect(JSON.stringify(selection)).not.toContain(fixture.folder);
    const session = await fixture.runtime.invoke('createSession', { selectionId: selection!.selectionId, name: 'Import' });
    expect(session.counts.total).toBe(1);
    await expect(fixture.runtime.invoke('createSession', { selectionId: selection!.selectionId, name: 'Again' })).rejects.toThrow('hết hiệu lực');
  });
  it('rejects unrecognized settings fields and paginates filtered files in main', async () => {
    const fixture = await runtimeFixture(2);
    await expect(fixture.runtime.invoke('readSettings', { token: 'must-not-be-accepted' })).rejects.toThrow();
    const first = await fixture.runtime.invoke('listFiles', { sessionId: fixture.session.id, page: 1, size: 1 });
    const second = await fixture.runtime.invoke('listFiles', { sessionId: fixture.session.id, page: 2, size: 1 });
    expect(first.total).toBe(2); expect(first.items).toHaveLength(1); expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
    expect(first.items[0]).not.toHaveProperty('assets');
    await fixture.runtime.store.change(fixture.session.id, (record) => { record.files[0]!.status = 'error'; });
    const filtered = await fixture.runtime.invoke('listFiles', { sessionId: fixture.session.id, page: 1, size: 1, status: 'error' });
    expect(filtered.total).toBe(1); expect(filtered.items[0]!.status).toBe('error');
    await expect(fixture.runtime.invoke('listFiles', { sessionId: '../escape', page: 1, size: 1 })).rejects.toThrow();
  });
  it('constructs remote admin links from the bound origin and entity IDs instead of server-supplied URLs', async () => {
    const fixture = await runtimeFixture();
    await fixture.runtime.store.change(fixture.session.id, (record) => {
      record.session.destinationOrigin = 'https://website.test';
      record.files[0]!.remote = { status: 'complete', payloadHash: 'a'.repeat(64), operationId: 'operation',
        outfitId: 'b'.repeat(24), collectionId: 'a'.repeat(24), adminOutfitPath: 'https://untrusted.test/collect' };
    });
    await fixture.runtime.invoke('openRemote', { sessionId: fixture.session.id, fileId: fixture.file.id, kind: 'outfit' });
    expect(fixture.host.openExternal).toHaveBeenCalledWith(`https://website.test/admin/outfits/${'b'.repeat(24)}`);
  });
  it.each(['processing', 'failed'] as const)('opens a confirmed partial entity ID from a %s receipt at the pinned website', async (status) => {
    const fixture = await runtimeFixture();
    await fixture.runtime.store.change(fixture.session.id, (record) => {
      record.session.destinationOrigin = 'https://website.test';
      record.files[0]!.remote = { status, payloadHash: 'a'.repeat(64), operationId: 'partial-operation',
        collectionId: 'a'.repeat(24), adminCollectionPath: 'https://untrusted.test/collect' };
    });
    await fixture.runtime.invoke('openRemote', { sessionId: fixture.session.id, fileId: fixture.file.id, kind: 'collection' });
    expect(fixture.host.openExternal).toHaveBeenCalledWith(`https://website.test/admin/collections/${'a'.repeat(24)}`);
  });
  it('does not open an inferred admin URL when no entity ID has been confirmed', async () => {
    const fixture = await runtimeFixture();
    await fixture.runtime.store.change(fixture.session.id, (record) => {
      record.session.destinationOrigin = 'https://website.test';
      record.files[0]!.remote = { status: 'processing', payloadHash: 'a'.repeat(64), operationId: 'partial-operation',
        adminOutfitPath: 'https://untrusted.test/collect' };
    });
    await expect(fixture.runtime.invoke('openRemote', { sessionId: fixture.session.id, fileId: fixture.file.id, kind: 'outfit' })).rejects.toThrow();
    expect(fixture.host.openExternal).not.toHaveBeenCalled();
  });
});
