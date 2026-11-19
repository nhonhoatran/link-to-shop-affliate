import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CODEX_MODEL } from '@under30ss/shared';
import { runBoundedProcess } from '../../src/main/bounded-process';
import { analyzePoster } from '../../src/main/codex-adapter';
import { isolateCodex } from '../../src/main/codex-isolation';
import { cleanupDirectories, imageFixture, posterFixture, settingsFixture, temporaryDirectory } from './test-fixtures';

vi.mock('../../src/main/bounded-process', () => ({ runBoundedProcess: vi.fn() }));
vi.mock('../../src/main/codex-isolation', () => ({ isolateCodex: vi.fn() }));
beforeEach(() => {
  vi.mocked(runBoundedProcess).mockReset();
  vi.mocked(isolateCodex).mockReset().mockResolvedValue({ executable: 'test-codex.exe', args: ['--no-daemon'], env: {} });
});
afterEach(cleanupDirectories);
const setup = async () => {
  const directory = await temporaryDirectory();
  const source = path.join(directory, 'original-sensitive-name.png');
  await writeFile(source, await imageFixture());
  const workRoot = path.join(directory, 'agent-work'); await mkdir(workRoot);
  return { source, workRoot, settings: settingsFixture(), signal: new AbortController().signal };
};
const answer = (events: unknown[] = [{ type: 'turn.completed' }], result: unknown = posterFixture(), exitCode = 0) => {
  vi.mocked(runBoundedProcess).mockImplementation(async (input) => {
    const output = input.args[input.args.indexOf('--output-last-message') + 1]!;
    await writeFile(output, JSON.stringify(result));
    for (const event of events) input.onStdout?.(`${JSON.stringify(event)}\n`);
    return { stdout: '', stderr: '', exitCode };
  });
};

describe('Codex image analysis adapter', () => {
  it('rejects a website import token pasted into the prompt before starting the AI subprocess', async () => {
    const fixture = await setup();
    fixture.settings.prompt.text = `Do not send this credential: u30_import_${'x'.repeat(32)}`;
    await expect(analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).rejects.toThrow('token website');
    expect(isolateCodex).not.toHaveBeenCalled(); expect(runBoundedProcess).not.toHaveBeenCalled();
  });
  it('attaches only the copied image and schema, sends the prompt through stdin and cleans up its workspace', async () => {
    const fixture = await setup(); answer(); fixture.settings.cli.model = 'selected-model';
    expect(await analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).toEqual(posterFixture());
    const input = vi.mocked(runBoundedProcess).mock.calls[0]![0];
    expect(input.stdin).toBe(fixture.settings.prompt.text);
    expect(input.args).toEqual(expect.arrayContaining(['--sandbox', 'read-only', '--ephemeral', '--ignore-rules', '--model', 'selected-model']));
    expect(input.args).not.toContain(fixture.source);
    expect(path.basename(input.args[input.args.indexOf('--image') + 1]!)).toBe('input.png');
    expect(await readdir(fixture.workRoot)).toEqual([]);
    expect((await readFile(fixture.source)).length).toBeGreaterThan(0);
  });
  it.each(['', 'gpt-6-astra'])('always passes the supported default model explicitly for legacy model %s', async (model) => {
    const fixture = await setup(); answer(); fixture.settings.cli.model = model;
    await analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal);
    const args = vi.mocked(runBoundedProcess).mock.calls[0]![0].args;
    expect(args).toEqual(expect.arrayContaining(['--model', DEFAULT_CODEX_MODEL]));
  });
  it('accepts a nonfatal error item but rejects fatal stream errors even when a final file exists', async () => {
    const fixture = await setup();
    answer([{ type: 'item.completed', item: { type: 'error' } }, { type: 'turn.completed' }]);
    await expect(analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).resolves.toMatchObject({ version: 'poster-analysis.v1' });
    answer([{ type: 'error', message: 'Gateway rejected the turn' }, { type: 'turn.completed' }]);
    await expect(analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).rejects.toThrow('Gateway rejected');
  });
  it('rejects tool calls, malformed output and duplicate item identities', async () => {
    const fixture = await setup();
    answer([{ type: 'item.started', item: { type: 'command_execution' } }]);
    await expect(analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).rejects.toThrow('ngoài phạm vi');
    const duplicate = posterFixture(); duplicate.items.push({ ...duplicate.items[0]! }); answer(undefined, duplicate);
    await expect(analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).rejects.toThrow('trùng');
    answer(undefined, { arbitrary: true });
    await expect(analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).rejects.toThrow();
    expect(await readdir(fixture.workRoot)).toEqual([]);
  });
  it('bounds the final result file and redacts provider credentials from failures', async () => {
    const fixture = await setup(); fixture.settings.limits.maxOutputBytes = 4096;
    vi.mocked(runBoundedProcess).mockImplementation(async (input) => {
      await writeFile(input.args[input.args.indexOf('--output-last-message') + 1]!, ' '.repeat(5000) + JSON.stringify(posterFixture()));
      return { exitCode: 0, stdout: '', stderr: '' };
    });
    await expect(analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).rejects.toThrow('giới hạn');
    vi.mocked(runBoundedProcess).mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Bearer imp_1234567890abcdef' });
    await expect(analyzePoster(fixture.source, fixture.settings, fixture.workRoot, fixture.signal)).rejects.toThrow('[REDACTED]');
  });
});
