import { describe, expect, it } from 'vitest';
import { runBoundedProcess } from '../../src/main/bounded-process';
import { codexEnvironment, codexExecutable } from '../../src/main/codex-isolation';

const run = (code: string, overrides: Partial<Parameters<typeof runBoundedProcess>[0]> = {}) => runBoundedProcess({
  executable: process.execPath, args: ['-e', code], cwd: process.cwd(), env: codexEnvironment(),
  signal: new AbortController().signal, timeoutMs: 3000, maxOutputBytes: 4096, ...overrides,
});

describe('bounded native child process', () => {
  it('collects process output and exit status without a shell', async () => {
    const result = await run('process.stdout.write("ok"); process.stderr.write("diagnostic"); process.exitCode = 7;');
    expect(result).toEqual({ stdout: 'ok', stderr: 'diagnostic', exitCode: 7 });
  });
  it('preserves Vietnamese characters split across UTF-8 stream chunks', async () => {
    const text = 'Tiếng Việt: áo và bộ sưu tập';
    const code = `const b=Buffer.from(${JSON.stringify(text)}); let i=0; const timer=setInterval(()=>{ if(i===b.length){clearInterval(timer);return;} process.stdout.write(b.subarray(i,i+1)); i++; },2);`;
    expect((await run(code)).stdout).toBe(text);
  });
  it('terminates on an output cap and a timeout', async () => {
    await expect(run('process.stdout.write("x".repeat(10000)); setInterval(()=>{},1000);', { maxOutputBytes: 100 })).rejects.toThrow('vượt giới hạn');
    await expect(run('setInterval(()=>{},1000);', { timeoutMs: 100 })).rejects.toThrow('thời gian chờ');
  });
  it('cancels a running child and rejects an already aborted invocation', async () => {
    const controller = new AbortController();
    const pending = run('process.stdout.write("ready"); setInterval(()=>{},1000);', {
      signal: controller.signal, onStdout: () => controller.abort(),
    });
    await expect(pending).rejects.toThrow('Đã hủy');
    await expect(run('throw new Error("Must not run")', { signal: controller.signal })).rejects.toThrow('Đã hủy');
  });
  it('stops on a rejected event parser and reports a missing executable', async () => {
    await expect(run('console.log("invalid event"); setInterval(()=>{},1000);', { onStdout: () => { throw new Error('Rejected JSON event'); } })).rejects.toThrow('Rejected JSON event');
    await expect(run('', { executable: 'u30-missing-codex-executable.exe' })).rejects.toThrow('Không chạy được Codex CLI');
  });
  it('forwards AI runtime variables but excludes website, database and storage credentials', () => {
    const environment = codexEnvironment({ PATH: 'runtime', SystemRoot: 'system', OPENAI_API_KEY: 'ai-only',
      WEBSITE_IMPORT_TOKEN: 'private-web', MONGODB_URI: 'private-db', S3_SECRET_KEY: 'private-storage' });
    expect(environment).toEqual({ PATH: 'runtime', SystemRoot: 'system', OPENAI_API_KEY: 'ai-only' });
    expect(() => codexExecutable('C:\\tools\\codex.cmd')).toThrow('executable');
    expect(() => codexExecutable('C:\\tools\\codex.ps1')).toThrow('executable');
    expect(codexExecutable('C:\\tools\\codex.exe')).toBe('C:\\tools\\codex.exe');
  });
  it('filters a website token even when it was accidentally assigned to an allowed AI environment variable', () => {
    const environment = codexEnvironment({ OPENAI_API_KEY: `u30_import_${'x'.repeat(32)}`,
      CODEX_API_KEY: 'separate-ai-credential', PATH: 'runtime' });
    expect(environment).not.toHaveProperty('OPENAI_API_KEY');
    expect(environment.CODEX_API_KEY).toBe('separate-ai-credential');
  });
});
