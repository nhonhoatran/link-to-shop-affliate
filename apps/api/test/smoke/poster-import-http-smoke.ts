import { createHash } from 'node:crypto';
import { copyFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { outfitSchema, posterAnalysisSchema, type PosterAnalysis } from '@under30ss/shared';
import { draftFromAnalysis } from '../../../desktop/src/main/draft-actions';
import { ImportClient } from '../../../desktop/src/main/import-client';
import { syncApprovedSession } from '../../../desktop/src/main/sync-session';
import { createSyncPayload, syncOperationId } from '../../../desktop/src/main/sync-payload';
import { findStoredFile } from '../../../desktop/src/main/session-store';
import { CollectionModel } from '../../src/models/collection-model';
import { ImportOperationModel } from '../../src/models/import-operation-model';
import { ImportSessionModel } from '../../src/models/import-session-model';
import { OutfitModel } from '../../src/models/outfit-model';
import { makeImporter } from '../helpers/import-fixtures';
import { closeHttpServer, prepareDesktopHttp } from '../helpers/desktop-import-fixtures';
import { startTestApp, type TestApp } from '../helpers/test-app';

const repoRoot = path.resolve(process.cwd(), '../..');
const scratchParent = path.join(repoRoot, 'apps/desktop/dist/test-tmp-poster-import');
const recordedInputs = [
  {
    source: 'assets-source/lookbook-samples/outfit-mesh-84-reference.png',
    report: 'plans/reports/261118-codex-desktop-live-probe.json',
    expectedItems: 9,
  },
  {
    source: 'assets-source/lookbook-samples/outfit-dramatic-reference.png',
    report: 'plans/reports/261118-codex-desktop-live-probe-retry.json',
    expectedItems: 8,
  },
] as const;

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const readRecordedAnalysis = async (sourcePath: string, reportPath: string, expectedItems: number): Promise<PosterAnalysis> => {
  const report = JSON.parse(await readFile(path.join(repoRoot, reportPath), 'utf8')) as {
    samples?: Array<{ source?: string; sourceSha256?: string; status?: string; analysis?: unknown }>;
  };
  const sample = report.samples?.find((entry) => entry.source === sourcePath);
  if (!sample || sample.status !== 'validated' || !sample.sourceSha256 || !sample.analysis) {
    throw new Error(`Missing validated recorded analysis for ${sourcePath} in ${reportPath}`);
  }
  const image = await readFile(path.join(repoRoot, sourcePath));
  expect(sha256(image)).toBe(sample.sourceSha256);
  const analysis = posterAnalysisSchema.parse(sample.analysis);
  expect(analysis.status).toBe('needs_review');
  expect(analysis.reviewReasons.length).toBeGreaterThan(0);
  expect(analysis.items).toHaveLength(expectedItems);
  return analysis;
};

let app: TestApp;
let desktop: Awaited<ReturnType<typeof prepareDesktopHttp>>;

beforeAll(async () => {
  app = await startTestApp();
  desktop = await prepareDesktopHttp(app, scratchParent);
  for (const filename of ['one.png', 'two.png']) await rm(path.join(desktop.source, filename), { force: true });
  for (const { source } of recordedInputs) {
    const sourcePath = path.join(repoRoot, source);
    await copyFile(sourcePath, path.join(desktop.source, path.basename(source)));
  }
});

afterAll(async () => {
  if (desktop) {
    await closeHttpServer(desktop.server);
    await rm(desktop.root, { recursive: true, force: true });
  }
  if (app) await app.stop();
});

describe('recorded poster analyses through actual desktop importer HTTP', () => {
  it('creates two reviewable drafts with the image-derived item counts and replays without duplicates', async () => {
    const analyses = await Promise.all(recordedInputs.map(({ source, report, expectedItems }) =>
      readRecordedAnalysis(source, report, expectedItems)));
    const { token, admin } = await makeImporter(app);
    const runtime = desktop.runtime;
    const settings = (await runtime.invoke('readSettings', {})).settings;
    settings.siteUrl = desktop.origin;
    await runtime.invoke('saveSettings', { settings, token });

    const selection = await runtime.invoke('chooseFolder', {});
    if (!selection) throw new Error('Fixture folder selection failed');
    const session = await runtime.invoke('createSession', { selectionId: selection.selectionId, name: 'Poster samples' });
    const files = await runtime.invoke('listFiles', { sessionId: session.id, page: 1, size: 20 });
    expect(files.total).toBe(2);

    const expectedByFilename = new Map(recordedInputs.map((input, index) => [path.basename(input.source), {
      analysis: analyses[index]!, expectedItems: input.expectedItems,
    }]));
    const prepared = [] as Array<{ id: string; revision: number; itemCount: number }>;
    for (const file of files.items) {
      const sample = expectedByFilename.get(file.name);
      if (!sample) throw new Error(`Unexpected source image in fixture folder: ${file.name}`);
      // Reuse previously recorded provider output; this smoke makes no Codex or provider call.
      await runtime.store.change(session.id, (record) => {
        const stored = findStoredFile(record, file.id);
        stored.analysis = sample.analysis;
        stored.status = 'ready';
      });
      const draft = draftFromAnalysis(sample.analysis, file.name);
      expect(draft.items).toHaveLength(sample.expectedItems);
      expect(draft.reviewReasons).toEqual(sample.analysis.reviewReasons);
      expect(draft.items.map((item) => item.reviewReasons)).toEqual(sample.analysis.items.map((item) => item.reviewReasons));
      const saved = await runtime.invoke('updateDraft', {
        sessionId: session.id, fileId: file.id, expectedRevision: 0, draft,
      });
      expect(saved.status).toBe('ready');
      expect(saved.approvedRevision).toBeNull();
      expect(saved.draft?.items).toHaveLength(sample.expectedItems);
      prepared.push({ id: file.id, revision: saved.revision, itemCount: sample.expectedItems });
    }

    const signal = new AbortController().signal;
    const client = new ImportClient(desktop.origin, token, 30_000, signal);
    const sync = (activeRuntime = runtime) => syncApprovedSession(activeRuntime.store, session.id, client, signal, () => undefined);
    await expect(sync()).rejects.toThrow('Không có bản nháp đã duyệt');
    expect(await ImportSessionModel.countDocuments()).toBe(0);

    // This explicit fixture review preserves the recorded needs_review flags and reasons.
    for (const file of prepared) {
      await runtime.invoke('approve', { sessionId: session.id, fileId: file.id, expectedRevision: file.revision });
    }
    await sync();

    const sessionView = await runtime.invoke('getSession', { sessionId: session.id });
    expect(sessionView.counts.synced).toBe(2);
    expect(await ImportSessionModel.countDocuments()).toBe(1);
    expect(await OutfitModel.countDocuments()).toBe(2);
    expect(await CollectionModel.countDocuments()).toBe(2);
    expect(await ImportOperationModel.countDocuments({ status: 'complete' })).toBe(2);
    expect(app.s3Puts).toHaveLength(19);

    const replayedOutfitIds = new Set<string>();
    for (const file of prepared) {
      const synced = await runtime.invoke('getFile', { sessionId: session.id, fileId: file.id });
      expect(synced.status).toBe('synced');
      const remote = synced.remote;
      if (!remote?.outfitId) throw new Error(`Missing completed import receipt for ${synced.name}`);
      const response = await admin.get(`/api/admin/outfits/${remote.outfitId}`).expect(200);
      const outfit = outfitSchema.parse(response.body);
      expect(outfit.status).toBe('draft');
      expect(outfit.items).toHaveLength(file.itemCount);

      const stored = findStoredFile(await runtime.store.get(session.id), file.id);
      const replay = await client.commit(session.id, syncOperationId(stored), createSyncPayload(stored));
      if (!replay.outfitId) throw new Error(`Missing replay outfit receipt for ${synced.name}`);
      expect(replay.outfitId).toBe(remote.outfitId);
      replayedOutfitIds.add(replay.outfitId);
    }
    expect(replayedOutfitIds.size).toBe(2);
    expect(await OutfitModel.countDocuments()).toBe(2);
    expect(await CollectionModel.countDocuments()).toBe(2);
    expect(await ImportOperationModel.countDocuments({ status: 'complete' })).toBe(2);
  });
});
