import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzePoster } from '../../src/main/codex-adapter';
import type * as CodexAdapter from '../../src/main/codex-adapter';
import { DesktopJobs } from '../../src/main/desktop-jobs';
import { SettingsStore } from '../../src/main/settings-store';
import { cleanupDirectories, posterFixture, sessionFixture, settingsFixture, testEncryption } from './test-fixtures';

vi.mock('../../src/main/codex-adapter', async (original) => ({
  ...await original<typeof CodexAdapter>(), analyzePoster: vi.fn(),
}));
beforeEach(() => { vi.mocked(analyzePoster).mockReset(); });
afterEach(cleanupDirectories);
const setup = async (count = 1) => {
  const fixture = await sessionFixture(count);
  const settings = new SettingsStore(path.join(fixture.directory, 'settings'), testEncryption());
  const emit = vi.fn();
  const jobs = new DesktopJobs(fixture.store, settings, emit);
  return { ...fixture, settingsStore: settings, jobs, emit };
};
const stopped = async (jobs: DesktopJobs, id: string) => {
  await vi.waitFor(() => expect(jobs.active(id)).toBe(false), { timeout: 3000 });
};

describe('desktop background jobs', () => {
  it('rejects concurrent jobs within a session and cancels the current image before starting another', async () => {
    const fixture = await setup(2);
    vi.mocked(analyzePoster).mockImplementation(async (_source, _settings, _root, signal) => new Promise((_resolve, reject) => {
      if (signal.aborted) reject(new Error('cancelled'));
      else signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
    }));
    expect(await fixture.jobs.analyze(fixture.session.id)).toEqual({ started: true });
    await vi.waitFor(() => expect(analyzePoster).toHaveBeenCalledTimes(1));
    await expect(fixture.jobs.analyze(fixture.session.id)).rejects.toThrow('đang có tác vụ');
    expect(fixture.jobs.cancel(fixture.session.id)).toEqual({ cancelled: true });
    await stopped(fixture.jobs, fixture.session.id);
    const files = (await fixture.store.get(fixture.session.id)).files;
    expect(files.filter((file) => file.status === 'interrupted')).toHaveLength(1);
    expect(files.filter((file) => file.status === 'pending')).toHaveLength(1);
    expect(fixture.jobs.cancel(fixture.session.id)).toEqual({ cancelled: false });
    expect(fixture.emit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'session', message: 'Đã hủy tác vụ' }));
  });
  it('keeps a gateway failure retryable and persists the successful retry as an unapproved draft', async () => {
    const fixture = await setup();
    vi.mocked(analyzePoster).mockRejectedValueOnce(new Error('Gateway 403 client_not_allowed')).mockResolvedValueOnce(posterFixture());
    await fixture.jobs.analyze(fixture.session.id); await stopped(fixture.jobs, fixture.session.id);
    const failed = (await fixture.store.get(fixture.session.id)).files[0]!;
    expect(failed).toMatchObject({ status: 'error', draft: null, approvedRevision: null });
    expect(failed.error).toContain('client_not_allowed');
    await fixture.jobs.analyze(fixture.session.id); await stopped(fixture.jobs, fixture.session.id);
    const result = (await fixture.store.get(fixture.session.id)).files[0]!;
    expect(result).toMatchObject({ status: 'ready', revision: 1, approvedRevision: null });
    expect(result.analysis?.items).toHaveLength(1); expect(result.modelAssetId).not.toBeNull();
  });
  it('analyzes from the session configuration snapshot despite later settings changes', async () => {
    const fixture = await setup();
    const later = settingsFixture(); later.cli.model = 'different-later-model'; later.prompt.text = 'Prompt thay đổi sau khi tạo phiên';
    await fixture.settingsStore.save(later);
    vi.mocked(analyzePoster).mockResolvedValue(posterFixture());
    await fixture.jobs.analyze(fixture.session.id); await stopped(fixture.jobs, fixture.session.id);
    const used = vi.mocked(analyzePoster).mock.calls[0]![1];
    expect(used.cli.model).toBe(fixture.settings.cli.model);
    expect(used.prompt.text).toBe(fixture.settings.prompt.text);
    expect(used.prompt.text).not.toBe(later.prompt.text);
  });
  it('rejects file IDs from another session and clears all owned controllers on shutdown', async () => {
    const fixture = await setup();
    await expect(fixture.jobs.analyze(fixture.session.id, ['foreign-file'])).rejects.toThrow('không thuộc phiên');
    expect(fixture.jobs.active(fixture.session.id)).toBe(false); expect(analyzePoster).not.toHaveBeenCalled();
    vi.mocked(analyzePoster).mockImplementation(async (_source, _settings, _root, signal) => new Promise((_resolve, reject) => {
      if (signal.aborted) reject(new Error('cancelled'));
      else signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
    }));
    await fixture.jobs.analyze(fixture.session.id);
    await vi.waitFor(() => expect(analyzePoster).toHaveBeenCalled());
    await fixture.jobs.shutdown(); await stopped(fixture.jobs, fixture.session.id);
    expect((await fixture.store.get(fixture.session.id)).files[0]!.status).toBe('interrupted');
  });
});
