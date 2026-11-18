import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runBoundedProcess } from '../../src/main/bounded-process';
import { isolateCodex } from '../../src/main/codex-isolation';
import { settingsFixture } from './test-fixtures';

vi.mock('../../src/main/bounded-process', () => ({ runBoundedProcess: vi.fn() }));
beforeEach(() => { vi.mocked(runBoundedProcess).mockReset(); });
afterEach(() => vi.unstubAllEnvs());
const output = (value: unknown) => ({ exitCode: 0, stdout: JSON.stringify(value), stderr: '' });

describe('effective Codex configuration isolation', () => {
  it('disables every discovered server and verifies the effective result while retaining the selected provider profile', async () => {
    vi.stubEnv('WEBSITE_IMPORT_TOKEN', 'never-forward-this-secret');
    vi.mocked(runBoundedProcess).mockResolvedValueOnce(output([
      { name: 'known', enabled: true, env: { PRIVATE: 'not-exposed' } }, { name: 'new_server', enabled: true },
    ])).mockResolvedValueOnce(output([{ name: 'known', enabled: false }, { name: 'new_server', enabled: false }]));
    const settings = settingsFixture(); settings.cli.profile = 'chosen-profile';
    const result = await isolateCodex(settings, process.cwd(), new AbortController().signal);
    expect(result.args).toEqual(expect.arrayContaining(['--no-daemon', '--profile', 'chosen-profile',
      'mcp_servers.known.enabled=false', 'mcp_servers.new_server.enabled=false',
      'mcp_servers.known.required=false', 'mcp_servers.new_server.required=false', 'web_search="disabled"', 'never']));
    expect(result.args).not.toContain('--ignore-user-config');
    expect(result.args).not.toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(result.env).not.toHaveProperty('WEBSITE_IMPORT_TOKEN');
    expect(JSON.stringify(result)).not.toContain('not-exposed');
    expect(vi.mocked(runBoundedProcess).mock.calls).toHaveLength(2);
    expect(result.args.filter((entry) => entry === '--disable').length).toBeGreaterThan(8);
  });
  it('fails closed when a discovered server cannot be addressed with safe override syntax', async () => {
    vi.mocked(runBoundedProcess).mockResolvedValueOnce(output([{ name: 'unsafe.name', enabled: true }]));
    await expect(isolateCodex(settingsFixture(), process.cwd(), new AbortController().signal)).rejects.toThrow('ký tự đặc biệt');
    expect(runBoundedProcess).toHaveBeenCalledTimes(1);
  });
  it('blocks analysis when a required inherited server remains enabled or config output is malformed', async () => {
    vi.mocked(runBoundedProcess).mockResolvedValueOnce(output([{ name: 'server', enabled: true }]))
      .mockResolvedValueOnce(output([{ name: 'server', enabled: true }]));
    await expect(isolateCodex(settingsFixture(), process.cwd(), new AbortController().signal)).rejects.toThrow('chưa tắt');
    vi.mocked(runBoundedProcess).mockResolvedValueOnce({ exitCode: 0, stdout: 'not json', stderr: '' });
    await expect(isolateCodex(settingsFixture(), process.cwd(), new AbortController().signal)).rejects.toThrow();
  });
});
