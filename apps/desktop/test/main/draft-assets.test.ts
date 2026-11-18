import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { approveDesktopDraft, draftFromAnalysis, saveDesktopDraft } from '../../src/main/draft-actions';
import { pixelCrop } from '../../src/main/image-assets';
import { SessionStore } from '../../src/main/session-store';
import { createSyncPayload, syncOperationId } from '../../src/main/sync-payload';
import { cleanupDirectories, draftFixture, posterFixture, sessionFixture } from './test-fixtures';

afterEach(cleanupDirectories);

describe('draft review and deterministic crops', () => {
  it('rounds crop edges outward while staying inside a small source image', () => {
    expect(pixelCrop({ x: 0, y: 0, width: 100, height: 100 }, 7, 5)).toEqual({ left: 0, top: 0, width: 7, height: 5 });
    expect(pixelCrop({ x: 90, y: 90, width: 10, height: 10 }, 7, 5)).toEqual({ left: 6, top: 4, width: 1, height: 1 });
    expect(() => pixelCrop({ x: 99, y: 0, width: 2, height: 10 }, 7, 5)).toThrow();
  });
  it('creates real preview crops and preserves the original image', async () => {
    const { store, session, file, source } = await sessionFixture();
    const original = await readFile(source);
    const saved = await saveDesktopDraft(store, session.id, file.id, 0, draftFixture());
    expect(saved).toMatchObject({ revision: 1, approvedRevision: null, status: 'ready' });
    expect(saved).not.toHaveProperty('assets');
    expect(await sharp(await store.assetPath(session.id, saved.modelAssetId!)).metadata()).toMatchObject({ width: 50, height: 160 });
    expect(await sharp(await store.assetPath(session.id, saved.itemAssetIds.shirt!)).metadata()).toMatchObject({ width: 20, height: 40 });
    expect(await readFile(source)).toEqual(original);
  });
  it('invalidates approval after any saved edit and rejects stale revisions', async () => {
    const { store, session, file } = await sessionFixture();
    await saveDesktopDraft(store, session.id, file.id, 0, draftFixture());
    expect((await approveDesktopDraft(store, session.id, file.id, 1)).approvedRevision).toBe(1);
    const edited = draftFixture(); edited.items[0]!.affiliateUrl = 'https://shop.test/item';
    const saved = await saveDesktopDraft(store, session.id, file.id, 1, edited);
    expect(saved).toMatchObject({ revision: 2, approvedRevision: null, status: 'ready' });
    await expect(approveDesktopDraft(store, session.id, file.id, 1)).rejects.toThrow('đã thay đổi');
    const current = (await store.get(session.id)).files[0]!;
    expect(() => createSyncPayload(current)).toThrow();
  });
  it('rejects incomplete approval and converts a reviewed source anchor for the website', async () => {
    const { store, session, file } = await sessionFixture();
    const incomplete = draftFixture(); incomplete.modelCrop = null;
    await saveDesktopDraft(store, session.id, file.id, 0, incomplete);
    await expect(approveDesktopDraft(store, session.id, file.id, 1)).rejects.toThrow();
    await saveDesktopDraft(store, session.id, file.id, 1, draftFixture());
    await approveDesktopDraft(store, session.id, file.id, 2);
    const reviewed = (await store.get(session.id)).files[0]!;
    const payload = createSyncPayload(reviewed);
    expect(payload.outfit.items[0]!.anchor).toEqual({ x: 50, y: 50 });
    expect(payload.outfit).not.toHaveProperty('status');
    expect(payload.outfit).not.toHaveProperty('featured');
    expect(createSyncPayload(reviewed).payloadHash).toBe(payload.payloadHash);
    expect(syncOperationId(reviewed)).toBe(`${file.id}-r2`);
  });
  it('freezes an uncertain remote operation and never silently creates another revision', async () => {
    const { store, session, file } = await sessionFixture();
    await saveDesktopDraft(store, session.id, file.id, 0, draftFixture());
    await store.change(session.id, (record) => {
      record.files[0]!.remote = { operationId: `${file.id}-r1`, payloadHash: 'a'.repeat(64), status: 'processing' };
    });
    await expect(saveDesktopDraft(store, session.id, file.id, 1, draftFixture())).rejects.toThrow('đang xử lý hoặc đã gửi');
    expect((await store.get(session.id)).files[0]!.revision).toBe(1);
  });
  it('does not publish an asset path from a tampered checkpoint', async () => {
    const { store, session, file } = await sessionFixture();
    const record = await store.get(session.id);
    record.files[0]!.assets[file.sourceAssetId] = path.join('..', '..', 'credential.json');
    await writeFile(path.join(store.directory(session.id), 'manifest.json'), JSON.stringify(record));
    await expect(saveDesktopDraft(new SessionStore(store.root), session.id, file.id, 0, draftFixture())).rejects.toThrow();
  });
  it('maps uncertain analysis without inventing names, affiliate links or anchors', () => {
    const analysis = posterFixture(); analysis.title = null; analysis.items[0]!.name = null; analysis.items[0]!.sourceAnchor = null;
    const draft = draftFromAnalysis(analysis, 'Chuyến đi cuối tuần.png');
    expect(draft.items[0]).toMatchObject({ name: '', affiliateUrl: '', sourceAnchor: null });
    expect(draft.title).toBe('Chuyến đi cuối tuần');
  });
});
